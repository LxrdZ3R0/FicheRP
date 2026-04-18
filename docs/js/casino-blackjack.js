/* ══════════════════════════════════════════════════════════════════════
   casino-blackjack.js — Jaharta Casino · Blackjack
   Shared table (6 seats) · Dealer hits soft 17 · Blackjack pays 3:2
   Host-driven phases: betting → dealing → playing(turn per seat) → dealer → resolve
   ══════════════════════════════════════════════════════════════════════ */

(function () {

const TABLE_ID = 'blackjack_main';
const tableRef = () => db.collection(CC.CASINO_TABLES).doc(TABLE_ID);

const BETTING_MS   = 25000;
const DEAL_MS      = 1500;
const TURN_MS      = 20000;
const RESOLVE_MS   = 6000;
const SEATS        = 6;

let unsubTable = null;
let state = null;
let initialized = false;
let hostTimer = null;
let mySeat = null; // seat index
let lastClaimedRound = null;

/* ── Init ── */
window._bjInit = function () {
  if (initialized) return;
  initialized = true;
  subscribeTable();
  // Load The Fool dealer image (once, cached)
  window._loadDealerImage?.().then(() => { if (state) renderState(); });
};

window._bjOnModeChange = function () { /* leaves handled by user manual */ };

async function ensureTable() {
  const s = await tableRef().get();
  if (s.exists) return;
  await tableRef().set({
    game: 'blackjack',
    phase: 'betting',
    phase_started: Date.now(),
    phase_end: Date.now() + BETTING_MS,
    currency: 'silver_kanite',
    mode: 'normal',
    seats: Array(SEATS).fill(null), // { uid, username, avatar, bet, currency, hand, score, status, doubled }
    dealer_hand: [],
    dealer_score: 0,
    dealer_revealed: false,
    turn_seat: -1,
    turn_end: 0,
    deck: [],
    host: null,
    host_ping: 0,
    payouts: null
  });
}

async function subscribeTable() {
  await ensureTable();
  if (unsubTable) { try { unsubTable(); } catch {} }
  unsubTable = tableRef().onSnapshot(snap => {
    state = snap.data();
    if (!state) return;
    renderState();
    checkHost();
    // Detect my seat
    mySeat = null;
    (state.seats || []).forEach((s, i) => { if (s && s.uid === CASINO.uid) mySeat = i; });
  });
}

/* ── Host election + loop ── */
function checkHost() {
  const now = Date.now();
  const hostStale = !state.host || (now - (state.host_ping || 0) > 7000);
  if (hostStale) {
    setTimeout(async () => {
      try {
        await db.runTransaction(async tx => {
          const s = await tx.get(tableRef());
          const d = s.data();
          if (d.host && (Date.now() - (d.host_ping || 0) < 7000)) return;
          tx.update(tableRef(), { host: CASINO.uid, host_ping: Date.now() });
        });
      } catch {}
    }, Math.random() * 500);
  }
  if (state.host === CASINO.uid) {
    if (!hostTimer) hostTimer = setInterval(hostTick, 800);
  } else {
    if (hostTimer) { clearInterval(hostTimer); hostTimer = null; }
  }
}

async function hostTick() {
  if (!state) return;
  const now = Date.now();
  try { tableRef().update({ host_ping: now }); } catch {}

  const seatedCount = (state.seats || []).filter(Boolean).length;
  const seatedWithBets = (state.seats || []).filter(s => s && s.bet > 0).length;

  if (state.phase === 'betting' && now >= state.phase_end) {
    if (seatedWithBets === 0) {
      // No bets — cycle
      await tableRef().update({
        phase: 'betting', phase_started: now, phase_end: now + BETTING_MS
      });
      return;
    }
    // Deal phase
    await dealInitial();
  }
  else if (state.phase === 'dealing' && now >= state.phase_end) {
    // Find first seat with bet > 0 and not BJ
    await advanceTurn(true);
  }
  else if (state.phase === 'playing') {
    // Check if current seat timed out
    if (now >= (state.turn_end || 0)) {
      await seatStand(state.turn_seat, true);
    }
  }
  else if (state.phase === 'dealer' && now >= state.phase_end) {
    await dealerPlay();
  }
  else if (state.phase === 'resolve' && now >= state.phase_end) {
    // Reset for next round — clear bets but keep seats
    const newSeats = (state.seats || []).map(s => s ? { ...s, bet: 0, hand: [], score: 0, status: null, doubled: false } : null);
    await tableRef().update({
      phase: 'betting',
      phase_started: now,
      phase_end: now + BETTING_MS,
      seats: newSeats,
      dealer_hand: [],
      dealer_score: 0,
      dealer_revealed: false,
      turn_seat: -1,
      deck: [],
      payouts: null
    });
  }
}

function freshDeck() {
  const d = [];
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  for (let n = 0; n < 6; n++) { // 6 decks
    for (const s of suits) for (const r of ranks) d.push(r + s);
  }
  // Fisher-Yates
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(c) {
  const r = c.length === 3 ? c.slice(0, 2) : c[0]; // '10' is 2 chars
  if (r === 'A') return 11;
  if (r === 'K' || r === 'Q' || r === 'J' || r === '10') return 10;
  return parseInt(r);
}
function handScore(cards) {
  let total = 0, aces = 0;
  cards.forEach(c => {
    const v = cardValue(c);
    total += v;
    if (v === 11) aces++;
  });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function isBlackjack(cards) { return cards.length === 2 && handScore(cards) === 21; }

async function dealInitial() {
  const deck = freshDeck();
  const seats = (state.seats || []).map(s => {
    if (!s || !s.bet || s.bet <= 0) return s;
    const h = [deck.pop(), deck.pop()];
    const sc = handScore(h);
    return { ...s, hand: h, score: sc, status: isBlackjack(h) ? 'bj' : 'waiting', doubled: false };
  });
  const dealer_hand = [deck.pop(), deck.pop()];
  await tableRef().update({
    phase: 'dealing',
    phase_started: Date.now(),
    phase_end: Date.now() + DEAL_MS,
    seats,
    dealer_hand,
    dealer_score: 0,
    dealer_revealed: false,
    deck
  });
}

async function advanceTurn(firstTurn) {
  const seats = [...(state.seats || [])];
  let startIdx = firstTurn ? 0 : (state.turn_seat + 1);
  let nextIdx = -1;
  for (let i = startIdx; i < SEATS; i++) {
    const s = seats[i];
    if (s && s.bet > 0 && s.status === 'waiting') { nextIdx = i; break; }
  }
  const now = Date.now();
  if (nextIdx === -1) {
    // All seats played — dealer phase
    await tableRef().update({
      phase: 'dealer',
      phase_started: now,
      phase_end: now + 1500,
      turn_seat: -1,
      dealer_revealed: true
    });
  } else {
    await tableRef().update({
      phase: 'playing',
      turn_seat: nextIdx,
      turn_end: now + TURN_MS
    });
  }
}

async function seatStand(seatIdx, auto) {
  const seats = [...(state.seats || [])];
  if (!seats[seatIdx]) return;
  seats[seatIdx] = { ...seats[seatIdx], status: 'stand' };
  await tableRef().update({ seats });
  // Advance
  await advanceTurn(false);
}

async function dealerPlay() {
  // Dealer hits soft 17+? Standard: dealer hits on soft 17. We'll hit on <17 + soft 17.
  const anyStand = (state.seats || []).some(s => s && s.bet > 0 && s.status === 'stand');
  const deck = [...(state.deck || [])];
  let dh = [...(state.dealer_hand || [])];
  if (anyStand) {
    while (true) {
      const sc = handScore(dh);
      // Check for soft 17
      let aces = 0, total = 0;
      dh.forEach(c => { const v = cardValue(c); total += v; if (v === 11) aces++; });
      const soft = (total === 17 && aces > 0); // before reduction → soft 17 if has ace still at 11
      if (sc < 17) { dh.push(deck.pop()); continue; }
      if (sc === 17 && soft) { dh.push(deck.pop()); continue; }
      break;
    }
  }
  const dscore = handScore(dh);
  // Compute payouts
  const seats = [...(state.seats || [])];
  const payouts = {};
  const finalSeats = seats.map(s => {
    if (!s || !s.bet) return s;
    let result = 'lose', profit = -s.bet;
    const pScore = s.score;
    if (s.status === 'bust') {
      result = 'lose'; profit = -s.bet;
    } else if (s.status === 'bj') {
      if (isBlackjack(dh)) { result = 'push'; profit = 0; }
      else { result = 'won'; profit = Math.floor(s.bet * 1.5); }
    } else {
      if (dscore > 21) { result = 'won'; profit = s.bet; }
      else if (pScore > dscore) { result = 'won'; profit = s.bet; }
      else if (pScore === dscore) { result = 'push'; profit = 0; }
      else { result = 'lose'; profit = -s.bet; }
    }
    if (payouts[s.uid] === undefined) payouts[s.uid] = 0;
    payouts[s.uid] += (profit + (result === 'lose' ? 0 : s.bet)); // returnAmount
    return { ...s, status: result };
  });
  const now = Date.now();
  await tableRef().update({
    phase: 'resolve',
    phase_started: now,
    phase_end: now + RESOLVE_MS,
    dealer_hand: dh,
    dealer_score: dscore,
    deck,
    seats: finalSeats,
    payouts
  });
}

/* ── User actions ── */
window.bjSit = async function () {
  if (!state) return;
  if (mySeat !== null) { showToast('Tu as déjà un siège', 'info'); return; }
  // Allowed only during betting
  if (state.phase !== 'betting') { showToast('Attends la prochaine manche', 'error'); return; }
  // Mode/currency match?
  const selCurrency = CASINO.mode === 'prime' ? 'navarites' : (document.getElementById('bj-currency').value);
  if (state.currency && !Object.values(state.seats || []).some(Boolean) && selCurrency !== state.currency) {
    // If table empty, change currency
  }
  try {
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const d = s.data();
      if (d.phase !== 'betting') throw new Error('Manche en cours');
      const seats = [...(d.seats || [])];
      if (seats.some(x => x && x.uid === CASINO.uid)) throw new Error('Tu es déjà assis');
      const idx = seats.findIndex(x => !x);
      if (idx === -1) throw new Error('Table pleine');
      // If table has active seats with a different currency, refuse mode mismatch
      const anySeat = seats.find(Boolean);
      if (anySeat && anySeat.currency !== selCurrency) throw new Error('Table en ' + window._currencyLabel(anySeat.currency));
      seats[idx] = { uid: CASINO.uid, username: CASINO.username, avatar: CASINO.avatar, bet: 0, currency: selCurrency, hand: [], score: 0, status: null, doubled: false };
      tx.update(tableRef(), { seats, currency: selCurrency });
    });
  } catch (e) { showToast(e.message || 'Erreur', 'error'); }
};

window.bjLeave = async function () {
  if (mySeat === null) return;
  try {
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const d = s.data();
      const seats = [...(d.seats || [])];
      const i = seats.findIndex(x => x && x.uid === CASINO.uid);
      if (i === -1) return;
      // If still in betting and bet > 0, refund
      const seat = seats[i];
      if (d.phase === 'betting' && seat && seat.bet > 0) {
        // refund after tx (not in tx)
        setTimeout(() => { window._credit(seat.currency, seat.bet); }, 100);
      }
      seats[i] = null;
      tx.update(tableRef(), { seats });
    });
  } catch (e) { showToast(e.message, 'error'); }
};

window.bjConfirmBet = async function () {
  if (mySeat === null) { showToast('Prends un siège d\'abord', 'error'); return; }
  if (state.phase !== 'betting') { showToast('Manche en cours', 'error'); return; }
  const amount = Math.floor(Number(document.getElementById('bj-bet-input').value) || 0);
  if (amount < 1) { showToast('Mise min : 1', 'error'); return; }
  const seat = state.seats[mySeat];
  const currency = seat.currency;
  const bal = window._getBalance(currency);
  const diff = amount - (seat.bet || 0);
  if (diff > bal) { showToast('Solde insuffisant', 'error'); return; }
  try {
    if (diff > 0) await window._debit(currency, diff);
    else if (diff < 0) await window._credit(currency, -diff);
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const d = s.data();
      if (d.phase !== 'betting') throw new Error('Trop tard');
      const seats = [...(d.seats || [])];
      if (!seats[mySeat] || seats[mySeat].uid !== CASINO.uid) throw new Error('Siège perdu');
      seats[mySeat] = { ...seats[mySeat], bet: amount };
      tx.update(tableRef(), { seats });
    });
    showToast('Mise validée : ' + amount, 'success', 2000);
  } catch (e) {
    // Refund if needed
    if (diff > 0) { try { await window._credit(currency, diff); } catch {} }
    showToast(e.message || 'Erreur', 'error');
  }
};

window.bjHit = async function () {
  if (!isMyTurn()) return;
  try {
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const d = s.data();
      if (d.turn_seat !== mySeat || d.phase !== 'playing') throw new Error('Pas ton tour');
      const seats = [...(d.seats || [])];
      const seat = { ...seats[mySeat] };
      const deck = [...(d.deck || [])];
      const card = deck.pop();
      seat.hand = [...seat.hand, card];
      seat.score = handScore(seat.hand);
      if (seat.score > 21) seat.status = 'bust';
      seats[mySeat] = seat;
      tx.update(tableRef(), { seats, deck, turn_end: Date.now() + TURN_MS });
    });
    // If busted, advance turn
    const cur = (await tableRef().get()).data();
    if (cur.seats[mySeat].status === 'bust') {
      await advanceTurn(false);
    }
  } catch (e) { showToast(e.message, 'error'); }
};

window.bjStand = async function () {
  if (!isMyTurn()) return;
  await seatStand(mySeat, false);
};

window.bjDouble = async function () {
  if (!isMyTurn()) return;
  const seat = state.seats[mySeat];
  if (!seat || seat.hand.length !== 2) { showToast('Doubler uniquement au 1er tour', 'error'); return; }
  const currency = seat.currency;
  const bal = window._getBalance(currency);
  if (bal < seat.bet) { showToast('Solde insuffisant pour doubler', 'error'); return; }
  try {
    await window._debit(currency, seat.bet);
    await db.runTransaction(async tx => {
      const s = await tx.get(tableRef());
      const d = s.data();
      if (d.turn_seat !== mySeat || d.phase !== 'playing') throw new Error('Pas ton tour');
      const seats = [...(d.seats || [])];
      const sSeat = { ...seats[mySeat] };
      const deck = [...(d.deck || [])];
      const card = deck.pop();
      sSeat.hand = [...sSeat.hand, card];
      sSeat.score = handScore(sSeat.hand);
      sSeat.bet = sSeat.bet * 2;
      sSeat.doubled = true;
      sSeat.status = sSeat.score > 21 ? 'bust' : 'stand';
      seats[mySeat] = sSeat;
      tx.update(tableRef(), { seats, deck });
    });
    await advanceTurn(false);
  } catch (e) {
    try { await window._credit(seat.currency, seat.bet); } catch {}
    showToast(e.message, 'error');
  }
};

function isMyTurn() {
  return state && state.phase === 'playing' && state.turn_seat === mySeat && mySeat !== null;
}

/* ── Render ── */
function renderState() {
  const phaseEl = document.getElementById('bj-phase');
  const timerEl = document.getElementById('bj-timer');
  const sitBtn = document.getElementById('bj-sit-btn');
  const leaveBtn = document.getElementById('bj-leave-btn');

  phaseEl.textContent = phaseLabel(state.phase);

  const endTime =
    state.phase === 'playing' ? state.turn_end :
    state.phase_end;
  const secLeft = Math.max(0, Math.ceil(((endTime || 0) - Date.now()) / 1000));
  timerEl.textContent = secLeft;

  sitBtn.style.display = mySeat === null ? '' : 'none';
  leaveBtn.style.display = mySeat !== null ? '' : 'none';

  // Dealer
  const dh = state.dealer_hand || [];
  const revealed = state.dealer_revealed;
  const dhEl = document.getElementById('bj-dealer-hand');
  dhEl.innerHTML = '';
  dh.forEach((c, i) => {
    const hide = !revealed && i === 1;
    dhEl.appendChild(buildCard(hide ? null : c));
  });
  document.getElementById('bj-dealer-score').textContent = revealed ? handScore(dh) : '';

  // Dealer avatar (The Fool)
  const dealerImgEl = document.getElementById('bj-dealer-avatar');
  if (dealerImgEl) {
    const url = window._getDealerImg?.();
    if (url && dealerImgEl.dataset.src !== url) {
      dealerImgEl.dataset.src = url;
      dealerImgEl.style.backgroundImage = `url("${url}")`;
      dealerImgEl.classList.add('loaded');
    }
  }

  // Seats
  const seatsEl = document.getElementById('bj-seats');
  seatsEl.innerHTML = '';
  (state.seats || []).forEach((s, i) => {
    const d = document.createElement('div');
    if (!s) {
      d.className = 'bj-seat empty';
      d.innerHTML = '<div class="seat-empty-label">Siège ' + (i + 1) + '<br><span>vide</span></div>';
    } else {
      const meCls = s.uid === CASINO.uid ? ' me' : '';
      const turnCls = state.turn_seat === i ? ' active' : '';
      const statusCls = s.status === 'bust' ? ' busted' : (s.status === 'won' ? ' won' : (s.status === 'push' ? ' push' : (s.status === 'lose' ? ' lost' : '')));
      d.className = 'bj-seat' + meCls + turnCls + statusCls;
      const handHtml = s.hand.map(c => `<div class="card ${isRed(c) ? 'red-suit' : 'black-suit'}"><span class="card-rank">${rank(c)}</span><span class="card-suit">${suit(c)}</span><span class="card-big-suit">${suit(c)}</span></div>`).join('');
      const statusLabel = s.status === 'bj' ? 'BLACKJACK' : (s.status === 'bust' ? 'BUST' : (s.status === 'stand' ? 'STAND' : ''));
      const avatarHtml = s.avatar
        ? `<img class="seat-avatar" src="${escape(s.avatar)}" alt="" onerror="this.style.display='none'">`
        : `<div class="seat-avatar seat-avatar-ph">${escape((s.username || '?')[0].toUpperCase())}</div>`;
      d.innerHTML = `
        <div class="bj-seat-hand">${handHtml}</div>
        ${s.hand.length ? `<div class="bj-seat-score">${s.score}</div>` : ''}
        <div class="bj-seat-player">
          ${avatarHtml}
          <div class="bj-seat-meta">
            <div class="bj-seat-name">${escape(s.username || 'Joueur')}</div>
            <div class="bj-seat-bet">${window._fmtNum(s.bet || 0)} ${currencySymbol(s.currency)}</div>
          </div>
        </div>
        ${statusLabel ? `<div class="bj-seat-status ${s.status}">${statusLabel}</div>` : ''}
      `;
    }
    seatsEl.appendChild(d);
  });

  // Controls
  const betPanel = document.getElementById('bj-bet-panel');
  const actionPanel = document.getElementById('bj-action-panel');
  if (state.phase === 'betting' && mySeat !== null) {
    betPanel.style.display = 'flex';
    actionPanel.style.display = 'none';
  } else if (state.phase === 'playing' && isMyTurn()) {
    betPanel.style.display = 'none';
    actionPanel.style.display = 'flex';
    const seat = state.seats[mySeat];
    document.getElementById('bj-double').disabled = !(seat && seat.hand.length === 2);
  } else {
    betPanel.style.display = 'none';
    actionPanel.style.display = 'none';
  }

  // Resolve-phase payout claim
  if (state.phase === 'resolve' && state.payouts && mySeat !== null) {
    maybeClaimPayout();
  }
}

let _claimRound = null;
async function maybeClaimPayout() {
  const rk = state.phase_started + ':' + mySeat;
  if (_claimRound === rk) return;
  _claimRound = rk;
  const mySeatData = state.seats[mySeat];
  const payoutObj = state.payouts[CASINO.uid] || 0;
  // payouts[uid] was "returnAmount" per seat from dealer resolve; since one user = one seat at a time, it's direct
  if (payoutObj > 0) {
    try { await window._credit(mySeatData.currency, payoutObj); } catch (e) { window._dbg?.warn('[bj-credit]', e.message); }
  }
  const net = payoutObj - (mySeatData.bet || 0);
  window._logBet('blackjack', mySeatData.bet, mySeatData.currency, mySeatData.status || 'lose', net, { dealer: state.dealer_score, player: mySeatData.score });
  if (net > 0) showToast('🎉 ' + (mySeatData.status === 'bj' ? 'Blackjack ! ' : '') + '+' + window._fmtNum(net) + ' ' + window._currencyLabel(mySeatData.currency), 'success');
  else if (net === 0) showToast('Égalité (push)', 'info');
  else showToast('Perdu — ' + window._fmtNum(-net), 'error');
}

function phaseLabel(p) {
  switch (p) {
    case 'betting': return 'PLACEZ VOS MISES';
    case 'dealing': return 'DISTRIBUTION…';
    case 'playing': {
      const seat = state.seats[state.turn_seat];
      return 'TOUR : ' + (seat ? seat.username : '---').toUpperCase();
    }
    case 'dealer': return 'CROUPIER JOUE';
    case 'resolve': return 'RÉSOLUTION';
    default: return p || '';
  }
}

function buildCard(c) {
  const d = document.createElement('div');
  if (!c) { d.className = 'card back'; return d; }
  d.className = 'card deal-in ' + (isRed(c) ? 'red-suit' : 'black-suit');
  d.innerHTML = `<span class="card-rank">${rank(c)}</span><span class="card-suit">${suit(c)}</span><span class="card-big-suit">${suit(c)}</span>`;
  return d;
}
function rank(c) { return c.length === 3 ? c.slice(0, 2) : c[0]; }
function suit(c) { return c[c.length - 1]; }
function isRed(c) { const s = suit(c); return s === '♥' || s === '♦'; }

function currencySymbol(c) {
  if (c === 'navarites') return '✦';
  if (c === 'bronze_kanite') return '🥉';
  if (c === 'silver_kanite') return '🥈';
  if (c === 'gold_kanite') return '🥇';
  if (c === 'platinum_kanite') return '💎';
  return '';
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Timer tick ── */
setInterval(() => {
  if (state && document.getElementById('bj-timer')) {
    const endTime = state.phase === 'playing' ? state.turn_end : state.phase_end;
    const secLeft = Math.max(0, Math.ceil(((endTime || 0) - Date.now()) / 1000));
    document.getElementById('bj-timer').textContent = secLeft;
  }
}, 500);

})();
