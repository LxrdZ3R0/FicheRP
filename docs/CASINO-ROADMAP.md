# CASINO-ROADMAP.md — Jaharta RP Casino · Backlog d'améliorations

> Suggestions priorisées produites après l'audit 2026-04-24.
> Les bugs P0/P1/P2 de l'audit (résumés dans `CLAUDE.md`) sont **préalables** à ce backlog — non dupliqués ici.

---

## Priorités

| Tag | Signification |
|-----|---------------|
| **P0** | Indispensable, à faire rapidement |
| **P1** | Fort impact joueur, à planifier |
| **P2** | Nice-to-have, dans les prochains sprints |
| **P3** | Polish / idées long terme |

Effort : **S** (< 2h) · **M** (demi-journée) · **L** (1-2j) · **XL** (> 2j, souvent backend)

---

## 1 · Sécurité économique (défense en profondeur)

### 1.1 · Cloud Function pour toutes les opérations monétaires casino — P0 · XL
**Problème racine** : aujourd'hui, `players.navarites` et `economy.personal.*_kanite` sont modifiables sans auth côté client (seuls les champs sont whitelistés). Un client malveillant peut contourner les transactions et se créditer directement.
**Proposition** : toute opération de débit/crédit passe par une Cloud Function (endpoint HTTPS Firebase) avec service account admin. Le client n'écrit plus sur `players`/`economy` — il appelle `/casino/bet`, `/casino/payout`, `/casino/cashout`. Rules → `update: false` sauf admin.
**Dépendances** : Firebase plan Blaze (payant). Cloud Function hébergée dans `functions/` à ajouter au repo.
**Impact** : ferme définitivement P0-3 (flip triche), P1-1 (deck leak résoluble en stockant deck côté fonction), P1-2 (RNG côté serveur), et tous les scénarios "dev tools + edit variable".

### 1.2 · Rate-limit côté rules sur `casino_logs` — P1 · S
**Problème** : un client peut spammer `casino_logs` jusqu'à 1M $ de amount/profit. Les rules valident structure mais pas fréquence.
**Proposition** : ajouter dans rules `&& (resource.data.at + duration.value(500, 'ms')) < request.time` pour max 2 logs/s/joueur. Combiner avec whitelist `user_id == request.auth.token.uid` si migration auth.
**Effort** : rules uniquement.

### 1.3 · Validation des amounts contre les balances — P1 · M
**Problème** : un joueur peut logger `amount:1000000 profit:+1000000` sans avoir misé. Rien ne contraint les montants à être réalistes par rapport à sa balance réelle.
**Proposition** : côté Cloud Function (1.1), vérifier que `amount <= balance_avant_debit`. Impossible en rules pures (pas de lookup cross-doc).

### 1.4 · Ban casino utilisateur — P2 · M
**Problème** : un joueur toxique (triche détectée, spam) reste libre d'accéder au casino.
**Proposition** : `casino_config/main.banned_ids: [discord_id...]`. Check dans `loadCasino()` → affiche écran "banni". Admin panel : champ input + bouton ban/unban.
**Effort** : 1 champ config + UI admin + check client.

### 1.5 · Audit trail immuable des opérations critiques — P2 · M
**Problème** : `casino_logs` enregistre les paris, mais pas les opérations host (choix du result, shuffle deck, élection host). Audit post-incident difficile.
**Proposition** : `casino_events/{id}` avec `{type: 'host_elected'|'spin_result'|'hand_dealt', table, host, data, at}`. Rules : create:public, update/delete:false.

---

## 2 · UX & feedback joueur

### 2.1 · Sons / SFX casino — P1 · M
**Ajouts proposés** :
- Pose de chip roulette (cloc), spin wheel (whoosh), ball drop (click)
- Blackjack : deal card, hit, bust (buzzer), blackjack (fanfare), chip placement
- Poker : shuffle, deal, fold, raise, win (cheering)
- Global : toggle son dans wallet/userbar (persist localStorage)
**Dépendances** : audio assets (licence libre ou achat). Pas de lib (HTMLAudioElement suffit, avec pool pour éviter lag).
**Respect accessibilité** : `prefers-reduced-motion` ne concerne pas l'audio ; ajouter `prefers-reduced-sound` custom via toggle.

### 2.2 · Historique perso par joueur — P1 · M
**Actuel** : `casino_logs` est admin-only en lecture.
**Proposition** : ajouter une vue hub ou modal casino "Historique" qui lit `casino_logs where user_id == me` (ouvrir rules en lecture pour auto-lookup). Affiche 30 derniers paris, profit cumulé par jeu, plus gros gain.
**Effort** : 1 panel UI + modif rules (`allow read: if isAdmin() || request.auth.token.uid == resource.data.user_id`).

### 2.3 · Stats & leaderboards casino — P2 · L
**Proposition** :
- Top 10 gains lifetime (par jeu et global)
- Streak en cours (consécutifs wins)
- Badges/achievements (ex: "1 million kanites gagné", "Blackjack 21 naturel")
- Intégration dans hub existant (onglet Compagnons/Progression)
**Dépendances** : doc agrégé `casino_stats/{uid}` mis à jour à chaque payout. Migration batch pour historique existant.

### 2.4 · Notifications Discord (webhook) pour gros gains — P2 · S
**Proposition** : si payout > 100k bronze-equivalent (ou équiv navarites), poster dans un salon Discord "Casino Hall of Fame". Côté bot (pas côté site).
**Effort** : hook dans le bot existant.

### 2.5 · Tutoriel in-place & aide règles — P1 · M
**Actuel** : aucune explication des règles dans l'UI. Un nouveau joueur ne connaît pas les payouts roulette, les règles blackjack, les combinaisons poker.
**Proposition** :
- Bouton `?` dans le topbar de chaque jeu → modal cheat-sheet
- Lobby : ajouter sous chaque `lobby-card` un lien "Comment jouer ?"
**Effort** : 4 cartes de règles + toggle UI.

### 2.6 · Chat à la table (texte) — P2 · M
**Proposition** : `casino_chat/{tableId}/messages/{id}` → flux chat 20 derniers messages. Sanitize + rate-limit 1 msg/3s. Emoji picker optionnel.
**Risques** : modération (toxic chat). Mitigation : liste noire mots-clés + bouton "report".

### 2.7 · Session stats live — P3 · S
Affichage dans la userbar : "+2 500 silver aujourd'hui / -1 200 navarites cette heure". Calcul local depuis `casino_logs where user_id == me AND at > session_start`.

### 2.8 · Responsive mobile — P1 · M
**Actuel** : layout table poker/blackjack probablement cassé sur < 768px (6 seats horizontaux). Roulette board 12×5 = étroit.
**Proposition** :
- Roulette : board en scroll horizontal sur mobile
- Blackjack/Poker : 2 rangées de 3 seats au lieu d'1 de 6
- Wallet userbar : collapse en menu burger
**Effort** : media queries ciblées dans `casino.css`.

### 2.9 · `aria-live` sur toast + phase announcements — P2 · S
**Problème** : screen readers ne lisent pas les changements de phase ni les résultats.
**Proposition** : `<div id="toast" aria-live="polite" role="status">` + live region séparée pour les phases `<div aria-live="assertive">À toi de jouer</div>`.

---

## 3 · Features jeu

### 3.1 · Poker — Side-pots corrects — P1 · L
**Actuel** : all-in simplifié = pot entier (cf. P3-3 audit).
**Proposition** : calcul classique side-pots. Chaque all-in crée un pot limité au `total_bet` du short-stack × nombre de contenders. Les joueurs plus riches jouent un pot secondaire.
**Effort** : L (réécriture de la résolution showdown).

### 3.2 · Blackjack — Insurance & Split — P1 · L
- **Insurance** : si dealer montre un As, proposer insurance (mise = ½ mise, paye 2:1 si dealer a BJ).
- **Split** : si 2 cartes de même rank, doubler la mise et jouer 2 mains séparées.
**Effort** : L (changement du modèle seat → hands[] de longueur 1 ou 2).

### 3.3 · Blackjack — Surrender — P2 · S
Abandon après 2 cartes : perd la moitié de la mise, sort de la main. Classique et simple.

### 3.4 · Roulette — Paris annoncés — P2 · M
Paris nommés classiques : "Voisins du zéro", "Tiers", "Orphelins". Cases pré-calculées.

### 3.5 · Poker — Tournament mode — P3 · XL
Buy-in fixe, blindes qui montent, chips non convertibles. Tournoi 30min→2h. Réglé en navarites PRIME only.

### 3.6 · Quitte ou Double — Versions alternatives — P2 · M
- **Dés** : 1-6 pair/impair ou sur un chiffre (×6)
- **Cartes rouge/noir** : pioche 1 carte
Diversifie le flip solo, reste simple.

---

## 4 · Nouveaux jeux

### 4.1 · Machine à sous (slots) — P1 · L
3 rouleaux × 5 symboles. RTP configurable en admin. Animation GSAP. Progressive jackpot possible (part des pertes alimente un pot cumulé).

### 4.2 · Dés (craps simplifié) — P2 · M
Lance de 2 dés, paris sur 7/11/2/3/12/"any craps". Moins complexe que craps US.

### 4.3 · Baccarat — P2 · M
Punto/Banco/Tie. 3 boutons, 0 décision joueur (pur hasard mais popularité élevée en RP asiatique).

### 4.4 · Keno — P3 · L
20/80 tirages. Misé sur 1-10 numéros. Grilles de payouts selon hits.

### 4.5 · Multiplicateur / Crash — P2 · L
Inspiré "Aviator" : multiplicateur qui monte en temps réel, joueur peut cashout à tout moment avant crash. Très addictif, à manier avec modération thématique RP.

---

## 5 · Admin & modération

### 5.1 · Dashboard live casino — P1 · M
Panel admin dédié "Casino Monitor" :
- Utilisateurs connectés par jeu
- Tables actives (phase, host, pot)
- Gain/perte net sur 24h par joueur (top 10)
- Alertes auto sur comportements suspects (> X paris/min, profit > Y)

### 5.2 · Override admin — P2 · S
Bouton admin sur chaque table : "Forcer reset", "Expulser joueur", "Forcer fin de main". Pour débloquer en cas de bug.

### 5.3 · Config blindes/timers en live — P2 · S
Champs dans `casino_config/main` : `poker_blinds: {sb, bb}`, `poker_turn_ms`, `roulette_betting_ms`. Modifiables depuis admin panel, appliqués au prochain round.

### 5.4 · Export CSV logs — P3 · S
Bouton admin "Exporter logs 30j" → CSV téléchargé, pour analyse offline.

### 5.5 · Mode maintenance granulaire — P2 · S
`casino_config/main.disabled_games: ['poker']` → désactive uniquement poker. Déjà partiel avec `admin_only`, à étendre par-jeu.

---

## 6 · Performance & qualité technique

### 6.1 · Lazy-load modules jeu — P2 · M
**Actuel** : tous les modules (`casino-roulette.js`, `blackjack.js`, `poker.js`, `flip.js`) sont chargés dès l'ouverture de `casino.html` (~2 400 LOC JS parsées avant interaction).
**Proposition** : charger dynamiquement dans `selectGame()` :
```js
if (game === 'roulette' && !window._rlLoaded) {
  await import('../features/casino/casino-roulette.js');
}
```
Nécessite passage en ES modules. Alternative plus simple : `<script>` injecté dynamiquement. Gain : first paint casino plus rapide.

### 6.2 · Debounce des writes `current_bet` poker — P3 · S
Actuel : chaque action poker fait un tx Firestore. Envisageable de batcher les "check" multiples (street complète) mais compromet le temps réel.

### 6.3 · Moving average sur host heartbeat — P3 · S
Au lieu de `host_ping > 7000` → failover, utiliser moyenne mobile sur 3 derniers ping pour éviter failovers sur un flicker réseau.

### 6.4 · Tests unitaires kanite-wallet — P0 · S
**Priorité haute** étant donné le bug P0-2 de l'audit. Ajouter une suite minimale :
```js
// docs/shared/lib/kanite-wallet.test.js (vanilla HTML test runner)
assert(deductWithAutoConversion({silver:50, gold:1, platinum:3}, {silver_kanite:250}).silver === correctValue);
```
Exécuté via une page `tests.html` simple, ou Jest si on ajoute enfin un toolchain.

### 6.5 · Bundle casino CSS — P3 · M
`casino.css` = 1669 LOC. Extraire `cards.css`, `roulette.css`, `blackjack.css`, `poker.css`, `flip.css` pour maintenance. Pas de gain perf (tout chargé), mais clarté.

### 6.6 · Remplacer `setInterval` timers par `requestAnimationFrame` — P3 · S
4 setInterval actifs par jeu → CPU constant même quand l'onglet est caché. rAF + `document.visibilityState` visible uniquement → économies batterie mobile.

---

## 7 · Thématique RP

### 7.1 · The Fool comme personnage animé — P2 · M
Actuel : image statique. Proposition : 4-5 expressions (idle/dealing/big_win/big_loss/bust) swap selon état. Ou GIF/vidéo courte par état.

### 7.2 · Casino "événements" saisonniers — P2 · M
Events limités dans le temps (ex: Halloween → cartes custom, thème violet, payouts boostés 1.2×) via `casino_config/main.event: {id, start, end, modifiers}`.

### 7.3 · VIP / tiers — P2 · M
Seuils de mise cumulée déverrouillent : avatar frame gold, multiplicateur XP, accès tables privées.

### 7.4 · Histoire & lore du Fool — P3 · S
Modal "À propos" dans le lobby racontant le background RP du Fool (lien vers `lore.html` éventuellement).

---

## 8 · Tableau de bord de priorités

| Priorité | Items |
|----------|-------|
| **P0 (3)** | 1.1 Cloud Function · 6.4 Tests kanite-wallet · + les P0 de l'audit |
| **P1 (9)** | 1.2 Rate-limit logs · 1.3 Validation amounts · 2.1 SFX · 2.2 Historique perso · 2.5 Tutoriel · 2.8 Responsive · 3.1 Side-pots poker · 3.2 Insurance/Split BJ · 4.1 Slots · 5.1 Dashboard live |
| **P2 (15)** | 1.4 Ban · 1.5 Audit trail · 2.3 Stats · 2.4 Webhook Discord · 2.6 Chat · 2.9 aria-live · 3.3 Surrender · 3.4 Paris annoncés · 3.6 Flip variants · 4.2 Dés · 4.3 Baccarat · 4.5 Crash · 5.2 Override · 5.3 Config live · 5.5 Maintenance par-jeu · 6.1 Lazy-load · 7.1 Fool animé · 7.2 Events · 7.3 VIP |
| **P3 (10)** | 2.7 Session stats · 3.5 Tournament · 4.4 Keno · 5.4 Export CSV · 6.2 Debounce · 6.3 Moving avg heartbeat · 6.5 Bundle CSS · 6.6 rAF timers · 7.4 Lore Fool |

**Total items : 37 suggestions.**

---

## 9 · Ordre d'exécution recommandé

### Sprint 1 — Correctifs (1-2 jours)
Tous les P0/P1 de l'**audit** (bugs), sans lesquels rien d'autre ne devrait être ajouté.

### Sprint 2 — Sécurité fondamentale (3-5 jours)
- 6.4 Tests kanite-wallet (prérequis)
- 1.1 Cloud Function (chantier principal)
- Migration des modules pour utiliser les endpoints
- 1.2 Rate-limit

### Sprint 3 — UX joueur (2-3 jours)
- 2.5 Tutoriel
- 2.1 SFX (si assets dispo)
- 2.2 Historique perso
- 2.8 Responsive mobile

### Sprint 4 — Nouvelles features (variable)
Choix entre 3.1-3.2 (enrichir existant) ou 4.1 (Slots, nouveau jeu à fort impact). À décider selon traction joueur.

### Sprint 5+ — Admin + long terme
Dashboard, événements, VIP, tournament.

---

## Fin roadmap

Prochaine étape suggérée : valider le plan → prioriser Sprint 1 → exécuter les fixes de l'audit l'un après l'autre avec tests.
