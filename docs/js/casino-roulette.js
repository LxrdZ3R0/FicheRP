/* ══════════════════════════════════════════════════════════════════════
   casino-roulette.js — Jaharta Casino · Roulette Européenne (0-36)
   Shared table · Betting phase 30s · Spin 8s · Payout · History
   Host-driven (first player in table). Failover if host leaves.
   ══════════════════════════════════════════════════════════════════════ */

(function () {

/* ── Constants ── */
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const BETTING_MS = 30000;
const SPIN_MS    = 8000;
const RESOLVE_MS = 5000;

const TABLE_ID = 'roulette_main'; // shared global table
const tableRef = () => db.collection(CC.CASINO_TABLES).doc(TABLE_ID);

let unsubTable = null;
let state = null;
let localChip = 5;
let localBets = {}; // { betKey: amount } — not yet committed
let spinAnim = null;
let hostTimer = null;
let initialized = false;

/* ── Bet types ─────────────────────────────────────────────────────────
   betKey format:
     'n:<num>'    straight (35:1)
     'red','black','even','odd','low','high'  (1:1)
     'd:1','d:2','d:3'  dozen (2:1)
     'c:1','c:2','c:3'  column (2:1)
   ────────────────────────────────────────────────────────────────────── */
function payoutMultiplier(betKey, winNum) {
  if (betKey.startsWith('n:')) return Number(betKey.slice(2)) === winNum ? 35 : -1;
  if (winNum === 0) return -1; // 0 loses all outside bets
  const red = RED_NUMS.has(winNum);
  switch (betKey) {
    case 'red':   return red ? 1 : -1;
    case 'black': return red ? -1 : 1;
    case 'even':  return (winNum % 2 === 0) ? 1 : -1;
    case 'odd':   return (winNum % 2 !== 0) ? 1 : -1;
    case 'low':   return (winNum >= 1 && winNum <= 18) ? 1 : -1;
    case 'high':  return (winNum >= 19 && winNum <= 36) ? 1 : -1;
  }
  if (betKey.startsWith('d:')) {
    const d = Number(betKey.slice(2));
    const lo = (d - 1) * 12 + 1, hi = d * 12;
    return (winNum >= lo && winNum <= hi) ? 2 : -1;
  }
  if (betKey.startsWith('c:')) {
    const c = Number(betKey.slice(2));
    const mod = winNum % 3;
    // column 1: 1,4,7,... (mod===1) ; column 2: mod===2 ; column 3: mod===0
    const hit = (c === 1 && mod === 1) || (c === 2 && mod === 2) || (c === 3 && mod === 0);
    return hit ? 2 : -1;
  }
  return -1;
}

/* ── Init ── */
window._rlInit = function init() {
  if (initialized) return;
  initialized = true;
  buildBoard();
  bindChips();
  drawWheel(0);
  subscribeTable();
  document.getElementById('rl-clear').onclick = clearLocalBets;
};

window._rlOnModeChange = function () {
  // Clear local uncommitted bets when mode switches
  localBets = {};
  renderLocalBets();
};

/* ── Board UI ── */
function buildBoard() {
  const board = document.getElementById('rl-board');
  board.innerHTML = '';
  // Zero cell (spans 3 rows)
  const zero = cell('green', '0', { gridRow: '1 / span 3', gridColumn: '1 / span 1' });
  zero.dataset.bet = 'n:0';
  board.appendChild(zero);

  // Numbers 1-36 in 3 rows × 12 columns (columns = bets c:1 top, c:2 mid, c:3 bottom)
  // Classic layout: top row = 3,6,9,...,36 (c:3); mid = 2,5,8,...,35 (c:2); bottom = 1,4,...,34 (c:1)
  for (let col = 1; col <= 12; col++) {
    for (let row = 0; row < 3; row++) {
      const num = col * 3 - row; // row 0 → 3,6,9... row 1 → 2,5,8... row 2 → 1,4,7...
      const color = RED_NUMS.has(num) ? 'red' : 'black';
      const c = cell(color, String(num), { gridRow: (row + 1) + ' / span 1', gridColumn: (col + 1) + ' / span 1' });
      c.dataset.bet = 'n:' + num;
      board.appendChild(c);
    }
  }
  // Columns (right side)
  for (let i = 0; i < 3; i++) {
    const c = cell('split', '2 to 1', { gridRow: (i + 1) + ' / span 1', gridColumn: '14 / span 1' });
    // row 0 = column 3, row 1 = column 2, row 2 = column 1 (to match num layout)
    c.dataset.bet = 'c:' + (3 - i);
    board.appendChild(c);
  }
  // Dozens (row 4)
  const dozenLabels = ['1 to 12', '13 to 24', '25 to 36'];
  for (let i = 0; i < 3; i++) {
    const c = cell('split', dozenLabels[i], { gridRow: '4 / span 1', gridColumn: (i * 4 + 2) + ' / span 4' });
    c.dataset.bet = 'd:' + (i + 1);
    board.appendChild(c);
  }
  // Outside bets (row 5): 1-18, Even, Red, Black, Odd, 19-36
  const outsides = [
    { label: '1 TO 18', bet: 'low',   col: '2 / span 2' },
    { label: 'EVEN',    bet: 'even',  col: '4 / span 2' },
    { label: 'RED',     bet: 'red',   col: '6 / span 2', color: 'red' },
    { label: 'BLACK',   bet: 'black', col: '8 / span 2', color: 'black' },
    { label: 'ODD',     bet: 'odd',   col: '10 / span 2' },
    { label: '19 TO 36',bet: 'high',  col: '12 / span 2' }
  ];
  outsides.forEach(o => {
    const c = cell(o.color || 'split', o.label, { gridRow: '5 / span 1', gridColumn: o.col });
    c.dataset.bet = o.bet;
    board.appendChild(c);
  });

  // Delegate click
  board.onclick = (e) => {
    const c = e.target.closest('.rl-cell');
    if (!c || !c.dataset.bet) return;
    addLocalBet(c.dataset.bet);
  };
}
function cell(color, text, grid) {
  const d = document.createElement('div');
  d.className = 'rl-cell ' + color;
  d.textContent = text;
  if (grid) Object.assign(d.style, grid);
  return d;
}

function bindChips() {
  document.querySelectorAll('.rl-chip').forEach(c => {
    c.onclick = () => {
      localChip = Number(c.dataset.chip) || 5;
      document.querySelectorAll('.rl-chip').forEach(x => x.classList.toggle('active', x === c));
    };
  });
}

/* ── Local bet management (not yet committed) ── */
function addLocalBet(betKey) {
  if (!state || state.phase !== 'betting') { showToast('Mise fermée — attends le prochain tour', 'error', 2500); return; }
  const currency = state.currency || window._currentCurrency('rl-currency');
  if (CASINO.mode === 'prime' && state.currency && state.currency !== 'navarites') {
    showToast('Cette table est en mode NORMAL — change de mode', 'error'); return;
  }
  const committedTotal = getMyCommittedTotal();
  const localTotal = Object.values(localBets).reduce((a, b) => a + b, 0);
  const nextTotal = committedTotal + localTotal + localChip;
  if (nextTotal > window._getBalance(currency)) {
    showToast('Solde insuffisant', 'error'); return;
  }
  localBets[betKey] = (localBets[betKey] || 0) + localChip;
  renderLocalBets();
  commitLocalBets(); // auto-commit each chip for multiplayer sync
}

function clearLocalBets() {
  localBets = {};
  renderLocalBets();
  showToast('Tes nouvelles mises ont été retirées', 'info', 1800);
}

function renderLocalBets() {
  const chips = new Map();
  // Committed (from state.bets for me)
  if (state && state.bets) {
    Object.entries(state.bets).forEach(([uid, ub]) => {
      if (uid !== CASINO.uid) return;
      Object.entries(ub.bets || {}).forEach(([k, v]) => {
        chips.set(k, (chips.get(k) || 0) + v);
      });
    });
  }
  // Local uncommitted
  Object.entries(localBets).forEach(([k, v]) => {
    chips.set(k, (chips.get(k) || 0) + v);
  });

  // Clear existing stacks
  document.querySelectorAll('.rl-cell .chip-stack').forEach(e => e.remove());
  chips.forEach((amount, betKey) => {
    const cell = document.querySelector('.rl-cell[data-bet="' + CSS.escape(betKey) + '"]');
    if (cell) {
      const s = document.createElement('span');
      s.className = 'chip-stack';
      s.textContent = window._fmtNum(amount);
      cell.appendChild(s);
    }
  });
  // Total
  const myCommitted = getMyCommittedTotal();
  const myLocal = Object.values(localBets).reduce((a, b) => a + b, 0);
  document.getElementById('rl-bet-total').textContent = window._fmtNum(myCommitted + myLocal);
}

function getMyCommittedTotal() {
  if (!state || !state.bets || !state.bets[CASINO.uid]) return 0;
  return Object.values(state.bets[CASINO.uid].bets || {}).reduce((a, b) => a + b, 0);
}

/* ── Commit a single chip add via transaction + debit ── */
async function commitLocalBets() {
  if (!Object.keys(localBets).length) return;
  const pending = { ...localBets };
  localBets = {};
  const totalAmount = Object.values(pending).reduce((a, b) => a + b, 0);
  const currency = state.currency;
  try {
    // Debit player first
    await window._debit(currency, totalAmount);
    // Record bets in table
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const data = s.exists ? s.data() : null;
      if (!data || data.phase !== 'betting') {
        throw Object.assign(new Error('Phase terminée'), { _u: true });
      }
      const bets = { ...(data.bets || {}) };
      const mine = bets[CASINO.uid] || { username: CASINO.username, avatar: CASINO.avatar, bets: {}, total: 0 };
      mine.username = CASINO.username;
      mine.avatar = CASINO.avatar;
      mine.bets = { ...(mine.bets || {}) };
      Object.entries(pending).forEach(([k, v]) => {
        mine.bets[k] = (mine.bets[k] || 0) + v;
      });
      mine.total = Object.values(mine.bets).reduce((a, b) => a + b, 0);
      bets[CASINO.uid] = mine;
      tx.update(tableRef(), { bets });
    });
  } catch (e) {
    // Refund
    try { await window._credit(currency, totalAmount); } catch {}
    showToast(e._u ? e.message : 'Erreur de mise', 'error');
  }
}

/* ── Subscribe to table state ── */
async function subscribeTable() {
  await ensureTable();
  if (unsubTable) { try { unsubTable(); } catch {} }
  unsubTable = tableRef().onSnapshot(snap => {
    state = snap.exists ? snap.data() : null;
    if (!state) return;
    renderState();
    checkHost();
  });
}

async function ensureTable() {
  const s = await tableRef().get();
  if (s.exists) return;
  await tableRef().set({
    game: 'roulette',
    phase: 'betting',
    phase_started: Date.now(),
    phase_end: Date.now() + BETTING_MS,
    currency: 'silver_kanite', // default — first host determines
    mode: 'normal',
    bets: {},
    result: null,
    history: [],
    host: null,
    host_ping: 0
  });
}

/* ── Host system: first active bettor becomes host; heartbeat every 2s ── */
function checkHost() {
  if (!state) return;
  const now = Date.now();
  const isHost = state.host === CASINO.uid && (now - (state.host_ping || 0) < 7000);
  const hostStale = !state.host || (now - (state.host_ping || 0) > 7000);

  // Become host if nobody is active
  if (hostStale) {
    // Only elect me if I have bets or if nobody else has bets (to avoid races, random small delay)
    setTimeout(async () => {
      try {
        await db.runTransaction(async tx => {
          const s = await tx.get(tableRef());
          const d = s.data();
          if (!d) return;
          if (d.host && (Date.now() - (d.host_ping || 0) < 7000)) return;
          tx.update(tableRef(), { host: CASINO.uid, host_ping: Date.now() });
        });
      } catch {}
    }, Math.random() * 500);
  }

  // If I'm host, run the loop
  if (isHost || state.host === CASINO.uid) {
    if (!hostTimer) {
      hostTimer = setInterval(hostTick, 1000);
    }
  } else {
    if (hostTimer) { clearInterval(hostTimer); hostTimer = null; }
  }
}

async function hostTick() {
  if (!state) return;
  const now = Date.now();
  // Heartbeat
  try { tableRef().update({ host_ping: now }); } catch {}

  if (state.phase === 'betting' && now >= state.phase_end) {
    // Move to spinning
    const hasBets = state.bets && Object.values(state.bets).some(b => (b.total || 0) > 0);
    if (!hasBets) {
      // Nobody bet — restart betting
      await tableRef().update({
        phase: 'betting',
        phase_started: now,
        phase_end: now + BETTING_MS,
        bets: {}
      });
      return;
    }
    const result = Math.floor(Math.random() * 37);
    await tableRef().update({
      phase: 'spinning',
      phase_started: now,
      phase_end: now + SPIN_MS,
      result
    });
  } else if (state.phase === 'spinning' && now >= state.phase_end) {
    await resolveSpinAsHost();
  } else if (state.phase === 'resolved' && now >= state.phase_end) {
    // Reset for next round
    const hist = (state.history || []).slice(-20);
    hist.push(state.result);
    await tableRef().update({
      phase: 'betting',
      phase_started: now,
      phase_end: now + BETTING_MS,
      bets: {},
      result: null,
      history: hist.slice(-30)
    });
  }
}

async function resolveSpinAsHost() {
  const now = Date.now();
  const winNum = state.result;
  const bets = state.bets || {};
  // Pay out each player (I'm only host; I trigger each player's own credit via a "payouts" array)
  // But clients credit themselves (see watchPayouts). To avoid double-pay, use a single write.
  const payouts = {};
  Object.entries(bets).forEach(([uid, userBets]) => {
    let profit = 0;
    Object.entries(userBets.bets || {}).forEach(([k, v]) => {
      const m = payoutMultiplier(k, winNum);
      profit += v * m; // win: +v*mult, lose: -v
    });
    if (profit !== 0) payouts[uid] = profit;
  });
  await tableRef().update({
    phase: 'resolved',
    phase_started: now,
    phase_end: now + RESOLVE_MS,
    payouts
  });
}

/* ── Render state + run spin animation ── */
function renderState() {
  // Phase / timer
  const phaseEl = document.getElementById('rl-phase-label');
  const timerEl = document.getElementById('rl-timer');
  phaseEl.className = 'rl-phase-label ' + (state.phase || '');
  phaseEl.textContent =
    state.phase === 'betting'  ? 'FAITES VOS JEUX' :
    state.phase === 'spinning' ? 'PLUS RIEN NE VA' :
    state.phase === 'resolved' ? (state.result != null ? ('RÉSULTAT : ' + state.result) : 'RÉSOLUTION') :
    '---';
  const secLeft = Math.max(0, Math.ceil(((state.phase_end || 0) - Date.now()) / 1000));
  timerEl.textContent = secLeft;

  // Players list
  renderPlayers();

  // History
  const hist = state.history || [];
  const hl = document.getElementById('rl-hist-list');
  hl.innerHTML = '';
  hist.slice().reverse().forEach(n => {
    const d = document.createElement('span');
    const cls = n === 0 ? 'green' : (RED_NUMS.has(n) ? 'red' : 'black');
    d.className = 'rl-hist-num ' + cls;
    d.textContent = n;
    hl.appendChild(d);
  });

  // Board chips
  renderLocalBets();

  // Spin animation trigger
  if (state.phase === 'spinning' && state.result != null) {
    if (!spinAnim || spinAnim.target !== state.result) {
      runSpinAnimation(state.result);
    }
  } else if (state.phase === 'betting') {
    document.getElementById('rl-result').classList.remove('show');
  }

  // Payout claim (once per round for me)
  if (state.phase === 'resolved' && state.payouts && state.payouts[CASINO.uid] !== undefined) {
    maybeClaimPayout();
  }
}

function renderPlayers() {
  const list = document.getElementById('rl-players-list');
  list.innerHTML = '';
  const bets = state.bets || {};
  Object.entries(bets).forEach(([uid, ub]) => {
    const p = document.createElement('span');
    p.className = 'rl-player' + (uid === CASINO.uid ? ' me' : '');
    p.innerHTML = '<span>' + escape(ub.username || 'Joueur') + '</span><span class="rl-player-bet">' + window._fmtNum(ub.total || 0) + '</span>';
    list.appendChild(p);
  });
  if (!list.children.length) {
    list.innerHTML = '<span class="rl-player" style="opacity:.55">Aucune mise…</span>';
  }
}

/* ── Payout claim (each client credits their own balance once) ── */
let lastClaimedRound = null;
async function maybeClaimPayout() {
  const roundKey = (state.phase_started || 0) + ':' + state.result;
  if (lastClaimedRound === roundKey) return;
  lastClaimedRound = roundKey;

  const myProfit = state.payouts[CASINO.uid] || 0;
  const myBets = (state.bets || {})[CASINO.uid];
  if (!myBets) return;
  const currency = state.currency;
  const myTotal = myBets.total || 0;

  // Net return = original bet + profit (but we debited bet already, so we need to credit winnings = profit + win stake)
  // profit already accounts for -v on losing bets (net). If profit = 0 and I had bets, I lost everything.
  // If profit > 0: credit profit + win-stake? Let's compute per-bet:
  let returnAmount = 0;
  Object.entries(myBets.bets || {}).forEach(([k, v]) => {
    const m = window._rlPayoutMultiplier ? window._rlPayoutMultiplier(k, state.result) : payoutMultiplier(k, state.result);
    if (m > 0) returnAmount += v * (m + 1); // stake returned + winnings
  });
  if (returnAmount > 0) {
    try { await window._credit(currency, returnAmount); } catch (e) { window._dbg?.warn('[rl-credit]', e.message); }
  }
  window._logBet('roulette', myTotal, currency, myProfit > 0 ? 'win' : (myProfit < 0 ? 'lose' : 'push'), myProfit, { result: state.result });
  if (myProfit > 0) showToast('🎉 Gagné ! +' + window._fmtNum(myProfit) + ' ' + window._currencyLabel(currency), 'success', 4000);
  else if (myProfit < 0) showToast('Perdu ' + window._fmtNum(-myProfit) + ' ' + window._currencyLabel(currency), 'error', 3500);
}

/* ── Spin animation ── */
let wheelAngle = 0;
function drawWheel(angle) {
  const c = document.getElementById('rl-wheel');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const cx = W / 2, cy = H / 2, outer = Math.min(W, H) / 2 - 6, inner = outer - 60;
  ctx.clearRect(0, 0, W, H);

  // Outer rail
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const slice = (Math.PI * 2) / WHEEL_ORDER.length;
  for (let i = 0; i < WHEEL_ORDER.length; i++) {
    const n = WHEEL_ORDER[i];
    const start = -Math.PI / 2 - slice / 2 + i * slice;
    const end = start + slice;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, outer, start, end);
    ctx.closePath();
    ctx.fillStyle = n === 0 ? '#1c9c42' : (RED_NUMS.has(n) ? '#c9212b' : '#101014');
    ctx.fill();
    ctx.strokeStyle = '#e8b04a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Number
    ctx.save();
    const mid = (start + end) / 2;
    ctx.rotate(mid);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Orbitron';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(n, outer - 8, 0);
    ctx.restore();
  }
  // Inner hub
  ctx.beginPath();
  ctx.arc(0, 0, inner - 15, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2410';
  ctx.fill();
  ctx.strokeStyle = '#e8b04a';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Inner logo
  ctx.fillStyle = '#e8b04a';
  ctx.font = 'bold 22px Orbitron';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', 0, 0);
  ctx.restore();
}
window._rlPayoutMultiplier = payoutMultiplier;

function runSpinAnimation(target) {
  const idx = WHEEL_ORDER.indexOf(target);
  if (idx < 0) return;
  const slice = (Math.PI * 2) / WHEEL_ORDER.length;
  const targetAngle = -idx * slice + (Math.PI * 2) * 6; // spin 6 full rotations + target
  const start = performance.now();
  const duration = SPIN_MS;
  const from = wheelAngle % (Math.PI * 2);
  const delta = targetAngle - from;
  spinAnim = { target };
  const res = document.getElementById('rl-result');
  res.classList.remove('show');

  function frame(t) {
    const p = Math.min(1, (t - start) / duration);
    // easeOutCubic
    const ease = 1 - Math.pow(1 - p, 3);
    wheelAngle = from + delta * ease;
    drawWheel(wheelAngle);
    if (p < 1) requestAnimationFrame(frame);
    else {
      wheelAngle = targetAngle;
      drawWheel(wheelAngle);
      // Show result
      res.textContent = target;
      res.className = 'rl-result show ' + (target === 0 ? 'green' : (RED_NUMS.has(target) ? 'red' : 'black'));
      res.style.background = target === 0 ? '#1c9c42' : (RED_NUMS.has(target) ? '#c9212b' : '#101014');
      res.style.borderColor = '#e8b04a';
    }
  }
  requestAnimationFrame(frame);
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Timer tick (1s) ── */
setInterval(() => {
  if (state && document.getElementById('rl-timer')) {
    const secLeft = Math.max(0, Math.ceil(((state.phase_end || 0) - Date.now()) / 1000));
    const el = document.getElementById('rl-timer');
    if (el) el.textContent = secLeft;
  }
}, 500);

})();
