/* ══════════════════════════════════════════════════════════════════════
   casino-flip.js — Jaharta Casino · Quitte ou Double (Pile ou Face)
   Mode PRIME uniquement · Solo · Navarites seulement
   50/50 · win = pot doublé, peut encaisser après chaque win.

   Fix P0-3 (2026-04-24) : l'état (pot, streak, active) est désormais
   persisté dans `casino_flip_sessions/{uid}` et toutes les opérations
   (flip, cashout) sont transactionnelles. Avant, `session.pot` vivait
   uniquement en RAM côté client → un joueur pouvait éditer la valeur
   dans devtools puis qdCashout() pour créditer un montant arbitraire.
   ══════════════════════════════════════════════════════════════════════ */

(function () {

const FLIP_COL = 'casino_flip_sessions';
let initialized = false;
let unsubSession = null;
let session = null;     // { uid, initial, pot, streak, active, history, created_at, last_flip_at }
let localHistory = [];  // historique UI (persiste inter-sessions tant que tab ouvert)

function sessionRef() {
  if (!CASINO.uid) return null;
  return db.collection(FLIP_COL).doc(CASINO.uid);
}

window._qdInit = function () {
  if (initialized) return;
  initialized = true;
  subscribe();
  resetUI();
};

function subscribe() {
  const ref = sessionRef();
  if (!ref) return;
  if (unsubSession) { try { unsubSession(); } catch {} }
  unsubSession = ref.onSnapshot(snap => {
    session = snap.exists ? snap.data() : null;
    updateUI();
    // Restore UI state based on server session
    const startBtn = document.getElementById('qd-start');
    const pickRow  = document.getElementById('qd-pick-row');
    const cashBtn  = document.getElementById('qd-cashout');
    if (session && session.active) {
      if (startBtn) startBtn.style.display = 'none';
      if (pickRow)  pickRow.style.display = 'flex';
      if (cashBtn)  cashBtn.style.display = '';
    } else {
      if (startBtn) startBtn.style.display = '';
      if (pickRow)  pickRow.style.display = 'none';
      if (cashBtn)  cashBtn.style.display = 'none';
    }
  }, err => { window._dbg?.warn('[flip-sub]', err?.message); });
}

function resetUI() {
  document.getElementById('qd-start').style.display = '';
  document.getElementById('qd-pick-row').style.display = 'none';
  document.getElementById('qd-cashout').style.display = 'none';
  updateUI();
}

window.qdStart = async function () {
  if (CASINO.mode !== 'prime') { showToast('Mode PRIME requis', 'error'); return; }
  const initial = Math.floor(Number(document.getElementById('qd-initial').value) || 0);
  if (initial < 1) { showToast('Mise min : 1 navarite', 'error'); return; }
  if (initial > 1000000) { showToast('Mise max : 1 000 000 navarites', 'error'); return; }
  if (window._getBalance('navarites') < initial) { showToast('Solde insuffisant', 'error'); return; }
  if (session && session.active) { showToast('Tu as déjà une session en cours', 'info'); return; }

  // Débit d'abord (atomique) — si échec, on ne crée pas de session.
  try {
    await window._debit('navarites', initial);
  } catch (e) { showToast(e.message || 'Débit impossible', 'error'); return; }

  // Si un doc inactif subsiste (partie précédente terminée), le supprimer
  // d'abord. Sinon set() serait traité comme UPDATE par Firestore et les
  // rules rejettent la mutation de initial/created_at.
  try {
    const prev = await sessionRef().get();
    if (prev.exists && prev.data().active === false) {
      await sessionRef().delete();
    }
  } catch (e) { window._dbg?.warn('[flip-reset]', e?.message); }

  // Crée la session Firestore.
  try {
    await sessionRef().set({
      uid: CASINO.uid,
      initial,
      pot: initial,
      streak: 0,
      active: true,
      history: [],
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      last_flip_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Mise placée — choisis pile ou face', 'info');
  } catch (e) {
    // Rollback debit si création session échoue
    try { await window._credit('navarites', initial); } catch {}
    showToast('Erreur création session', 'error');
  }
};

window.qdFlip = async function (pick) {
  if (!session || !session.active) return;
  const coin = document.getElementById('qd-coin');
  const resEl = document.getElementById('qd-result');
  resEl.textContent = '';
  resEl.className = 'qd-result';

  // Disable UI pendant l'anim
  document.querySelectorAll('.qd-pick-row .qd-btn').forEach(b => b.disabled = true);
  document.getElementById('qd-cashout').disabled = true;

  // Animation pile ou face (visual only — le résultat est commité par la tx)
  const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
  const rotations = 5 + Math.floor(Math.random() * 3);
  const finalTurn = outcome === 'heads' ? 0 : 180;
  const targetDeg = (rotations * 360) + finalTurn;
  coin.style.setProperty('--coin-target', targetDeg + 'deg');
  coin.classList.remove('flipping');
  void coin.offsetWidth;
  coin.classList.add('flipping');

  // Commit transactionnel pendant l'animation
  const flipPromise = db.runTransaction(async tx => {
    const ref = sessionRef();
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error('Session introuvable'), { _u: true });
    const d = snap.data();
    if (!d.active) throw Object.assign(new Error('Session terminée'), { _u: true });
    const won = outcome === pick;
    const newHistory = [...(d.history || []), { outcome, pick, result: won ? 'win' : 'lose', pot: won ? d.pot * 2 : 0 }].slice(-50);
    if (won) {
      tx.update(ref, {
        pot: d.pot * 2,
        streak: (d.streak || 0) + 1,
        history: newHistory,
        last_flip_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      tx.update(ref, {
        pot: 0,
        active: false,
        history: newHistory,
        last_flip_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    return won;
  });

  setTimeout(async () => {
    coin.classList.remove('flipping');
    coin.style.transform = 'rotateY(' + finalTurn + 'deg)';
    try {
      const won = await flipPromise;
      if (won) {
        resEl.textContent = '✓ ' + (outcome === 'heads' ? 'PILE' : 'FACE') + ' — ×2 !';
        resEl.classList.add('win');
      } else {
        const lost = session?.initial || 0;
        window._logBet('flip', lost, 'navarites', 'lose', -lost, { streak: session?.streak || 0 });
        resEl.textContent = '✗ ' + (outcome === 'heads' ? 'PILE' : 'FACE') + ' — Perdu !';
        resEl.classList.add('lose');
        showToast('Perdu — ' + lost + ' navarites', 'error');
      }
    } catch (e) {
      showToast(e._u ? e.message : 'Erreur flip', 'error');
    } finally {
      document.querySelectorAll('.qd-pick-row .qd-btn').forEach(b => b.disabled = false);
      document.getElementById('qd-cashout').disabled = false;
    }
  }, 2600);
};

window.qdCashout = async function () {
  if (!session || !session.active || (session.pot || 0) <= 0) return;
  let amountCredited = 0;
  let initial = session.initial || 0;
  let streak = session.streak || 0;
  try {
    // Transaction : lit le pot frais sur Firestore (source de vérité), le
    // crédite au joueur, puis ferme la session. Impossible pour le client
    // de fabriquer un pot arbitraire — le credit vient du doc, pas de la RAM.
    await db.runTransaction(async tx => {
      const ref = sessionRef();
      const snap = await tx.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Session introuvable'), { _u: true });
      const d = snap.data();
      if (!d.active) throw Object.assign(new Error('Session déjà fermée'), { _u: true });
      if (!d.pot || d.pot <= 0) throw Object.assign(new Error('Rien à encaisser'), { _u: true });
      // Borne défensive : pot ne peut pas dépasser initial × 2^20 (21 wins consecutives)
      // — évite qu'un bug exotique ou injection écrive un pot irréaliste.
      const maxPot = (d.initial || 0) * Math.pow(2, 20);
      if (d.pot > maxPot) throw Object.assign(new Error('Pot invalide'), { _u: true });
      amountCredited = d.pot;
      initial = d.initial || 0;
      streak = d.streak || 0;
      tx.update(ref, { pot: 0, active: false, last_flip_at: firebase.firestore.FieldValue.serverTimestamp() });
    });
    // Crédit navarites (transaction séparée sur players/{uid})
    await window._credit('navarites', amountCredited);
    const profit = amountCredited - initial;
    window._logBet('flip', initial, 'navarites', 'win', profit, { streak });
    showToast('💰 Encaissé ' + amountCredited + ' navarites (+' + profit + ')', 'success');
  } catch (e) {
    showToast(e._u ? e.message : 'Erreur encaissement', 'error');
  }
};

function updateUI() {
  const pot    = session?.pot || 0;
  const streak = session?.streak || 0;
  document.getElementById('qd-pot').textContent = window._fmtNum(pot);
  document.getElementById('qd-streak').textContent = '×' + streak;
  const list = document.getElementById('qd-history-list');
  list.innerHTML = '';
  const hist = (session?.history || []).slice(-12).reverse();
  hist.forEach(h => {
    const d = document.createElement('span');
    d.className = 'qd-history-item ' + h.result;
    d.textContent = (h.outcome === 'heads' ? 'P' : 'F') + ' → ' + (h.result === 'win' ? '+' : '×');
    list.appendChild(d);
  });
}

})();
