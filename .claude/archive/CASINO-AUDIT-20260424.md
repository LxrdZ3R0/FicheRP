# Casino Nexus — Audit fonctionnel + sécurité

**Date :** 2026-04-24
**Branche :** main
**Commit de référence :** daba5ac (refactor casino SVG + JCards)
**Scope :** Roulette · Blackjack · Poker · Quitte ou Double
**Méthode :** lecture statique de tous les modules casino + firestore.rules + kanite-wallet, simulations papier sur les flux monétaires.

---

## Résumé exécutif

| Sévérité | Nombre |
|----------|--------|
| 🔴 P0 Bloquant | 3 |
| 🟠 P1 Critique (argent/intégrité) | 5 |
| 🟡 P2 Important (UX, race, robustesse) | 7 |
| 🟢 P3 Mineur (cosmétique, perf) | 5 |

**Les 3 P0 doivent être corrigés avant toute autre évolution.**

---

## 🔴 P0 — BLOQUANTS

### P0-1 — Désync rules Firestore ↔ IDs de table réels

**Fichiers :** [firestore.rules:209-210](firestore.rules#L209-L210) vs [casino-roulette.js:18-19](docs/features/casino/casino-roulette.js#L18-L19), [casino-blackjack.js:10-11](docs/features/casino/casino-blackjack.js#L10-L11), [casino-poker.js:11-12](docs/features/casino/casino-poker.js#L11-L12)

Les trois modules construisent leurs tables avec le pattern `TABLE_ID_BASE + '_' + mode` :
```js
const tableId = () => 'roulette_main' + '_' + (window.CASINO?.mode || 'normal');
// → 'roulette_main_normal' ou 'roulette_main_prime'
```

Mais la whitelist Firestore n'autorise que les IDs "plats" :
```
function isCasinoTable(tableId) {
  return tableId in ['roulette_main', 'blackjack_main', 'poker_main'];
}
```

→ Si les rules sont effectivement déployées telles quelles, **chaque `tableRef().set()` et `tableRef().update()` est rejeté** (permission-denied). Le casino ne peut pas exister en prod.

**Fix (2 options) :**
1. Aligner les rules sur le code : élargir `isCasinoTable` à 9 IDs (3 jeux × {normal, prime, main}) et supprimer la clé plate obsolète.
2. Ou revenir à une table unique par jeu avec un champ `mode` dans le doc (architecture initialement documentée). Plus simple mais ne permet pas deux parties parallèles en normal+prime.

Option 1 recommandée (change mineur dans rules) :
```
function isCasinoTable(tableId) {
  return tableId in [
    'roulette_main_normal','roulette_main_prime',
    'blackjack_main_normal','blackjack_main_prime',
    'poker_main_normal','poker_main_prime'
  ];
}
```

Après fix : mettre à jour CLAUDE.md + CLAUDE-CASINO.md + memory/project_jaharta.md qui mentionnent encore les IDs plats.

---

### P0-2 — Bug mathématique `deductWithAutoConversion` : sous-paiement silencieux

**Fichier :** [shared/lib/kanite-wallet.js:76-86](docs/shared/lib/kanite-wallet.js#L76-L86)

La boucle "casser un palier supérieur" contient deux défauts cumulés :

```js
for (var hi = idx + 1; hi < ORDER.length && remaining > 0; hi++) {
  if (wallet[ORDER[hi]] <= 0) continue;
  var rateHi   = Math.pow(RATE, hi - idx);
  var neededHi = Math.ceil(remaining / rateHi);
  var useHi    = Math.min(wallet[ORDER[hi]], neededHi);
  wallet[ORDER[hi]] -= useHi;
  var change = useHi * rateHi - remaining;
  remaining = 0;                      // ← BUG A : zéro inconditionnel
  if (change > 0) wallet[cur] += change;  // ← BUG B : change négatif ignoré
}
```

1. `remaining = 0` est écrit **inconditionnellement** après la première itération non-vide. Si le premier palier supérieur trouvé n'a pas assez (ex: 1 gold dispo pour 200 silver manquants), la boucle s'arrête comme si c'était payé.
2. Si `useHi * rateHi < remaining`, `change` est négatif → on ne fait rien. Le joueur a "payé" moins que dû.

**Scénario concret qui fait perdre de la valeur au joueur** (pas gagner — le problème est différent mais grave) :
- Wallet : `{silver:50, gold:1, platinum:3}` (= 3 015 000 bronze total, amplement suffisant)
- Mise : 250 silver (= 25 000 bronze)
- Check `totalInBronze >= cost` : 3M >= 25k ✅ passe
- Direct silver : 50 consommés → remaining = 200
- Première itération hi=gold : useHi=1, wallet.gold=0, change = 100-200 = **-100**, remaining=0
- **La transaction aboutit et écrit `{silver:0, gold:0, platinum:3}` — le joueur a été débité de 150 silver en valeur réelle pour une mise de 250**. Il reste 100 "crédit caché" que le serveur considère payé mais qui n'existent pas dans ses comptes.

**Mais ça fonctionne aussi à l'envers** — en fonction de l'ordre des tiers consommés, le joueur peut aussi perdre plus que sa mise. Le comportement est non-déterministe et incorrect.

**Fix correct :**
```js
for (var hi = idx + 1; hi < ORDER.length && remaining > 0; hi++) {
  if (wallet[ORDER[hi]] <= 0) continue;
  var rateHi   = Math.pow(RATE, hi - idx);
  var avail    = wallet[ORDER[hi]] * rateHi; // valeur dispo dans la devise cible
  var take     = Math.min(avail, remaining);
  var useHi    = Math.ceil(take / rateHi);   // coins cassés
  wallet[ORDER[hi]] -= useHi;
  var change = useHi * rateHi - take;
  remaining -= take;
  if (change > 0) wallet[cur] += change;
}
```

Et si `remaining > 0` après la boucle hi, passer à la boucle lo (déjà en place).

**Impact :** toutes les transactions kanite avec auto-conversion (hub-shops achats + casino débits) sont affectées dès qu'un seul tier supérieur n'est pas suffisant isolément. **Bug critique sur l'intégrité économique.**

---

### P0-3 — Quitte ou Double : credit fondé sur une variable client

**Fichier :** [casino-flip.js:92-107](docs/features/casino/casino-flip.js#L92-L107)

`qdCashout()` crédite `session.pot` où `session` est une variable JS **dans la closure du module**. Elle n'est pas persistée côté serveur. Un joueur qui ouvre la console peut :

```js
session.pot = 99999999; session.active = true;
qdCashout();
```

→ `await window._credit('navarites', 99999999)` → la transaction Firestore accepte (allow update si les seuls champs modifiés sont `display_theme`+`navarites`) → **le joueur crédite arbitrairement son compte navarites**.

**Impact :** vecteur de triche direct sur la monnaie prime. Le même mécanisme peut aussi être utilisé pour contourner les débits si le joueur bypass `qdStart`.

**Fix :** Toute logique argent du flip doit passer par un état serveur :
- Créer `casino_flip_sessions/{uid}` avec `{initial, pot, streak, active, seed, created_at}` côté client via transaction
- À chaque flip, écrire côté client dans le doc (transaction) ; la "vérité" est Firestore, pas la RAM
- `qdCashout` : transaction qui lit le doc, crédite le pot enregistré, marque `active:false`
- Rules : create/update limités aux champs whitelistés + max pot borné (ex: `pot <= initial * 2^20`)

Idéalement : déporter vers une Cloud Function pour le RNG honnête (le `Math.random()` côté client + `_credit` client = doublement vulnérable).

---

## 🟠 P1 — CRITIQUES (Intégrité économique / hidden-info leaks)

### P1-1 — Deck poker & blackjack stocké en clair dans le doc public

**Fichiers :** [casino-poker.js:340-353](docs/features/casino/casino-poker.js#L340) + [casino-blackjack.js:249-258](docs/features/casino/casino-blackjack.js#L249)

Quand le host distribue les cartes, il écrit `deck: [...restantes]` sur la table publique. `casino_tables` est `allow read: if true` (required pour host failover).

→ **N'importe quel joueur peut lire `state.deck` et connaître :**
- Poker : toutes les cartes communes futures (flop, turn, river) et les hole cards adverses (présentes dans `state.seats[*].hole`). **Cheating trivial.** Un joueur avisé peut adapter ses mises en fonction des cartes à venir.
- Blackjack : les cartes que le dealer va tirer et les cartes qu'on va tirer en cas de hit. Le joueur sait avant de cliquer Hit si ça bust ou non.

**Fix :** Impossible à résoudre proprement côté client sans Cloud Function. Mitigations court-terme :
1. Ne jamais écrire `deck` en clair : remplacer par une seed + index (cartes générées à la volée par tous les clients avec le même RNG déterministe à partir de la seed — mais alors un client malveillant peut aussi reconstruire les cartes).
2. Ou : stocker `deck` chiffré par une clé connue uniquement du host (inutilement complexe — le host peut tricher).
3. **Vraie solution** : déplacer la distribution vers une Cloud Function avec service account ; le deck reste côté serveur. Le client ne voit que ce que le serveur lui pousse.

Ce problème est fondamental à l'architecture host-driven client-only. À adresser dans le backlog comme projet P1 majeur.

---

### P1-2 — Host roulette choisit le résultat côté client

**Fichier :** [casino-roulette.js:483-489](docs/features/casino/casino-roulette.js#L483-L489)

```js
const result = Math.floor(Math.random() * 37);
await tableRef().update({ phase: 'spinning', ..., result });
```

Le host (premier joueur actif sur la table) peut manipuler le RNG :
```js
// Dans la console du host, juste avant la fin du betting :
Math.random = () => 0.5;  // Force result = 18
```

→ Le host peut piloter son résultat. Couplé à des mises invisibles juste avant le spin, un host malveillant peut systématiquement gagner.

**Fix :** Générer le résultat via commit-reveal (all clients submit a hash, host aggregates + reveals seed) ou via Cloud Function. Commit-reveal reste manipulable si le host est le dernier à révéler, mais limite fortement la fenêtre d'attaque.

---

### P1-3 — Blackjack : dealer hits sur hard 17 multi-ace (devrait check soft 17)

**Fichier :** [casino-blackjack.js:299-313](docs/features/casino/casino-blackjack.js#L299-L313)

```js
let aces = 0, total = 0;
dh.forEach(c => { const v = cardValue(c); total += v; if (v === 11) aces++; });
const soft = (total === 17 && aces > 0);
```

Pour la main A+A+5 (hard 17 après réduction d'un as, mais soft car l'autre as peut encore être 11) :
- `total` (avant réduction) = 27, `aces` = 2
- `soft = (27 === 17 && aces > 0)` = false
- Dealer ne tire pas alors qu'il devrait (standard casino : dealer hits soft 17)

**Impact :** edge-case rare (multi-aces dans dealer = proba ~0.6% par main), et l'erreur **favorise le joueur** (dealer s'arrête plus tôt qu'il ne devrait). Pas de fuite d'argent mais dévie du comportement casino standard.

**Fix :** calculer soft via `(handScore(dh) === 17 && cards.some(c => c[0] === 'A')) && (raw total with aces as 11 would be ≠ score)` — ou plus simple : iterer tant qu'au moins un as est encore compté 11 ET score <= 17.

```js
function isSoft17(cards) {
  let total = 0, aces = 0;
  cards.forEach(c => { const v = cardValue(c); total += v; if (v === 11) aces++; });
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total === 17 && aces > 0; // au moins un as encore à 11
}
```

---

### P1-4 — Blackjack `bjConfirmBet` : credit perdu sur abaissement de mise + erreur

**Fichier :** [casino-blackjack.js:399-427](docs/features/casino/casino-blackjack.js#L399-L427)

Si `diff < 0` (joueur réduit sa mise) :
1. `await window._credit(currency, -diff)` — crédit appliqué ✅
2. Transaction échoue (ex: phase passée à 'dealing' entre-temps)
3. Catch : `if (diff > 0) { refund }` — condition fausse, aucun rollback
4. **Joueur garde son crédit ET son siège garde la mise élevée d'origine** (puisque le seat n'a pas été update)

→ Duplication d'argent au profit du joueur.

**Fix :** symétriser la logique de rollback :
```js
} catch (e) {
  try {
    if (diff > 0) await window._credit(currency, diff);
    else if (diff < 0) await window._debit(currency, -diff);
  } catch {}
  showToast(...);
}
```

---

### P1-5 — Poker : le joueur qui quitte mid-turn bloque la table

**Fichier :** [casino-poker.js:403-425](docs/features/casino/casino-poker.js#L403-L425) + [casino-poker.js:357-360](docs/features/casino/casino-poker.js#L357-L360)

`pkLeave` pose `seats[i] = null`. Si ce joueur était `turn_seat`, le hostTick suivant appelle `autoAction` qui commence par :
```js
if (i < 0 || !seats[i]) return;
```
→ bail silencieux, le tour ne passe jamais. Le `turn_end` atteint, autoAction re-bail, **la table est figée en phase `playing`/`preflop`/etc. indéfiniment**, bloquant tous les autres joueurs.

**Fix dans `pkLeave`** : avant de null le seat, si `d.turn_seat === i && phase ∈ active`, soit :
- Appeler `actOn(i, {action:'fold'}, true)` dans la transaction (fold forcé) AVANT de nuller
- Ou advancer manuellement `turn_seat` vers le prochain actif

Plus simple :
```js
if (active && seats[i] && !seats[i].folded) {
  seats[i].folded = true;
  if (d.turn_seat === i) {
    const next = findNextActive(seats, i);
    tx.update(tableRef(), { seats, turn_seat: next, turn_end: Date.now() + TURN_MS });
    // laisser le host cleanup le seat lors du prochain hand
    return;
  }
}
seats[i] = null;
```

---

## 🟡 P2 — IMPORTANT (UX, race conditions, robustesse)

### P2-1 — Casino-core.js avatar fallback cassé depuis restructure

**Fichier :** [casino-core.js:151](docs/features/casino/casino-core.js#L151)
```js
document.getElementById('cu-avatar').src = CASINO.avatar || 'img/logo-jaharta.png';
```
Depuis la restructure R2 (assets déplacés vers `docs/assets/img/`), ce chemin est cassé depuis `pages/casino.html`. Devrait être `../assets/img/logo-jaharta.png`.

**Impact :** utilisateur sans avatar Discord voit une image cassée.

---

### P2-2 — Perf : lecture intégrale de `pnj` pour trouver "The Fool"

**Fichier :** [casino-core.js:495-519](docs/features/casino/casino-core.js#L495-L519)

`loadDealerImage()` fait `db.collection('pnj').get()` puis un `find()` côté client. Proportionnel au nombre de PNJ. Cache ensuite dans la RAM.

**Fix :** 
- Option simple : stocker l'URL dans `casino_config/main.dealer_img_url` (1 read au lieu de N).
- Option propre : query Firestore `.where('prenom', '==', 'The').where('nom', '==', 'Fool').limit(1)`.

---

### P2-3 — Chips roulette 1/5/10/25/50/100 indifférenciés entre kanites

**Fichier :** [casino.html:206-213](docs/pages/casino.html#L206-L213) + [casino-roulette.js:282](docs/features/casino/casino-roulette.js#L282)

Un chip "100" vaut :
- 100 bronze_kanite (= 1 silver)
- 100 silver_kanite (= 1 gold)
- 100 gold_kanite (= 1 platinum)
- 100 platinum_kanite (= 1M bronze, énorme)

Le chip est additionné à `localBets[betKey]` sans conversion et débité en **la devise active du select**. Ce n'est pas un bug, mais UX piégeuse : un joueur qui change de devise sans changer de chip peut parier 10x à 100x sa mise intentionnelle.

**Fix UX :** afficher la valeur réelle du chip sous forme `100 🥈` qui change dynamiquement avec la devise sélectionnée, ou limiter les chips en fonction du solde.

---

### P2-4 — `hostTick` utilise `state` (stale) pour décisions de phase

**Fichier :** tous les modules jeu (pattern commun)

Le `state` module-level est mis à jour par onSnapshot (async). Si un hostTick fire entre une transaction et la propagation du snapshot, le host peut décider d'une transition basée sur un état obsolète. Le tx interne re-check correctement la phase, donc pas de write corrompu, mais les tests de condition avant tx peuvent cracher (ex: `state.phase === 'betting' && now >= state.phase_end` alors que la table vient de passer à spinning, entraînant un update redondant).

**Mitigation :** chaque hostTick fait un `get()` frais de la table avant de décider. Petite augmentation du coût Firestore (~ 1-2 reads/s par host actif) mais robuste. Alternative : accepter ces races (elles sont bénignes pour le state final).

---

### P2-5 — Roulette: double timer intervals

**Fichiers :** [casino-roulette.js:100-102](docs/features/casino/casino-roulette.js#L100-L102) + [casino-roulette.js:717-723](docs/features/casino/casino-roulette.js#L717-L723)

Deux `setInterval` rafraîchissent le timer (250ms et 500ms). Redondant. Garder uniquement celui de `_rlInit` (`renderPhaseTimer`) qui gère aussi la barre de progression.

---

### P2-6 — `setSess` écrit simultanément les 3 clés localStorage (gacha/hub/casino)

**Fichier :** [casino-core.js:44-49](docs/features/casino/casino-core.js#L44-L49)

À la connexion casino, les 3 sessions sont overwrittées. Si un joueur a une session `hub_session` récente pour un autre Discord ID (changement de compte), il la perd silencieusement.

**Impact :** friction UX pour les joueurs multi-comptes (cas rare), pas de fuite d'argent.

**Fix :** ne pas écraser les autres sessions si l'ID diffère, ou détecter le conflit et prompter.

---

### P2-7 — Rules casino_logs : `user_id is string` mais core.js stocke `CASINO.uid` qui peut être number

**Fichier :** [casino-core.js:135](docs/features/casino/casino-core.js#L135) + [firestore.rules:240](firestore.rules#L240)

`CASINO.uid = String(sess.id)` ✅ force string. OK, mais la rule `user_id is string` + data direct `user_id: CASINO.uid` est OK. **Faux positif**, je retire ce point ; juste noter que tout repose sur ce cast — fragile si un chemin de code oublie `String()`.

---

## 🟢 P3 — MINEUR

### P3-1 — Fonction `escape()` dupliquée dans 3 modules (roulette, blackjack, poker)
Pattern identique, à extraire dans `shared/lib/utils.js` ou [kanite-wallet.js](docs/shared/lib/kanite-wallet.js:1) (déjà chargé partout).

### P3-2 — `findNextToAct(seats, dealer, postflop, newPot)` : `newPot` inutilisé
[casino-poker.js:568](docs/features/casino/casino-poker.js#L568) passe 4 args à une fonction qui en accepte 3.

### P3-3 — Poker : pas de side-pots
Documenté comme volontaire ("simplification : all-in = pot entier"). Inéquitable si un short-stack all-in bloque un heads-up entre deux gros stacks. Acceptable pour un casino RP casual, à documenter comme limitation dans l'UI.

### P3-4 — `bjSit` dead branch (signalée par Sprint 7 mais non supprimée ?)
La memory dit "Dead branch `bjSit` supprimée". Je confirme qu'elle n'est plus présente dans le code actuel ✅. **Pas d'action.**

### P3-5 — Accessibilité
- `role="dialog"` absent sur les panels casino — acceptable car ce ne sont pas des modals overlay
- ⚠ `<section class="login-gate">` devrait avoir `role="main"` ou être dans un landmark (règle CLAUDE.md sur landmarks)
- ⚠ Toast casino : pas de `aria-live="polite"` sur `#toast`

---

## Ce qui fonctionne bien (notes positives)

- ✅ Auth via transaction atomique sur `gacha_link_codes` — garantit usage unique
- ✅ `lastClaimedRound` dans roulette + `_claimRound` dans blackjack + `_claimedRound` dans poker → correctement préviennent les double-crédits payouts
- ✅ `forceClose` (casino fermé) → rembourse proprement mises en cours dans roulette + blackjack, et stack dans poker
- ✅ Currency lock par siège (BJ + poker) — pas de mélange de devises dans une table
- ✅ Transactions Firestore utilisées systématiquement pour les debit/credit (atomicité OK)
- ✅ Heartbeat séparé (`casino_heartbeats`) évite les re-renders intempestifs sur la table principale
- ✅ Host failover TTL 7s + claim avec jitter aléatoire (Math.random() * 500ms) → évite dual-host
- ✅ Cartes SVG (Sprint Design 1) : parse dual-format propre (`"A♠"` et `"As"`)
- ✅ XSS : `escape()` systématiquement sur les noms d'utilisateurs interpolés
- ✅ Évaluation main poker 7 cartes (straight flush → high card) + wheel A-5 → correcte
- ✅ Dealer BJ 3:2 + push BJ vs dealer BJ : correct

---

## Scénarios monétaires testés (simulations papier)

### Scénario A — Mise 250 silver avec {silver:50, gold:2} — **OK**
- direct 50 silver → remaining 200
- hi=gold : useHi=2, change=0, remaining=0 ✅
- Final: {silver:0, gold:0} — correct.

### Scénario B — Mise 250 silver avec {silver:50, gold:1, platinum:3} — **❌ BUG P0-2**
- direct 50 silver → remaining 200
- hi=gold : useHi=1 (1 dispo), change=-100, remaining=0 (force)
- Boucle s'arrête sans passer au platinum.
- Final: {silver:0, gold:0, platinum:3} — **100 silver manquants, joueur a payé trop peu**.

### Scénario C — Mise 250 silver avec {platinum:1} uniquement — **OK**
- direct 0 → remaining 250
- hi=gold : vide, continue
- hi=platinum : useHi=1, change=10000-250=9750, remaining=0
- Final: {silver:9750, gold:0, platinum:0} ✅ (la monnaie est rendue)

### Scénario D — Gain de 150 bronze sur {silver:50} — **OK**
- `addWithAutoConvertUp` : bronze += 150
- autoConvertUp : bronze 150 → carry 1, bronze=50, silver+=1
- Final: {bronze:50, silver:51} ✅

### Scénario E — Mise 500 navarites avec `players.navarites = 500` — **OK**
- Chemin direct, `cur < amount` → `cur === amount` passe, write `navarites: 0` ✅

---

## Recommandations pour ordre de correction

1. **Immédiat** (avant tout autre change) : vérifier que le casino fonctionne en prod — si non, fix P0-1 (rules) d'abord.
2. **P0-2 (kanite math)** : tests unitaires sur `deductWithAutoConversion` + fix — impacte aussi le hub-shops.
3. **P0-3 (flip)** : migration vers état Firestore.
4. **P1-4 (bjConfirmBet)** : fix symmetric rollback — 5 lignes.
5. **P1-3 (soft 17)** : fix helper — 10 lignes.
6. **P1-5 (poker leave mid-turn)** : fix dans `pkLeave` — 15 lignes.
7. **P2-1 (avatar path)** : `../assets/img/...` — 1 ligne.
8. **P2-5 (double timer)** : supprimer le `setInterval` tail — 6 lignes.
9. **P1-1 et P1-2** (deck leak + host RNG) : projet long, nécessite Cloud Function — voir `docs/CASINO-ROADMAP.md` Phase 3.

---

## Fin de l'audit

Statistiques :
- Fichiers lus intégralement : 8 (core, roulette, blackjack, poker, flip, casino.html, firestore.rules, kanite-wallet.js)
- LOC audités : ~5 700
- Temps de l'audit : ~45 min
- Questions en suspens : 1 (P0-1 : les rules sont-elles effectivement celles déployées ?)