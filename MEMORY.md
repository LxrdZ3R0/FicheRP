# MEMORY.md — JahartaRP Project Memory
> Fichier de mémoire dynamique. Se met à jour après chaque session de travail significative.
> Format : décisions prises, bugs résolus, état actuel, prochaines étapes.

---

## ÉTAT ACTUEL DU PROJET
**Dernière mise à jour :** 2026-04-09 (session 4 — fix display + lazy tabs)
**Branche :** main
**Phase :** Sprint 3 terminé ✓ — Audit stabilité complet — Lazy hub tabs ✓

### Architecture globale
- GitHub Pages → `/docs` (auto-deploy sur `main`)
- Backend : Firebase Firestore + Storage + Auth (Google uniquement)
- Frontend : HTML5 / CSS3 / JS vanilla — zéro bundler, imports ESM depuis CDN
- Pas de framework JS sauf Alpine.js dans `admin.html` (onglets réactifs)
- Three.js + GSAP dans `gacha.html` (blob) et `hub.html` (scan silhouette)

### Fichiers clés et tailles (lignes)
| Fichier | Lignes | Statut |
|---------|--------|--------|
| `hub.html` | 1073 | −74% ✓ (était 4042) |
| `css/hub.css` | 878 | Extrait de hub.html ✓ |
| `js/hub-inventory.js` | 763 | Extrait ✓ |
| `js/hub-shops.js` | 736 | Extrait ✓ |
| `js/hub-renders.js` | 300 | Extrait ✓ |
| `js/hub-character.js` | 200 | Extrait ✓ |
| `js/hub-dashboard.js` | 121 | Extrait ✓ |
| `gacha.html` | 2638 | GRAVE — à découper Sprint 4 |
| `css/jaharta.css` | 2500 | Source de vérité + keyframes partagés |
| `fiches.html` | 1349 | Limite haute |
| `racesjouables.html` | 1127 | OK |
| `lore.html` | 1296 | Limite haute |
| `pnj.html` | 782 | OK |
| `portail.html` | 386 | OK |
| `admin.html` | 559 | OK |

---

## PROBLÈMES CRITIQUES IDENTIFIÉS

### P1 — hub.html : monolithe de 4042 lignes ✅ RÉSOLU (2026-04-09)
**Avant :** 4042 lignes tout dans un seul fichier.
**Après décomposition complète :**
- `hub.html` : 1073 lignes (−74% ✓)
- `css/hub.css` : 878 lignes (CSS extrait)
- `js/hub-inventory.js` : 763 lignes (23 fonctions inventaire : drag/drop, slots, tooltips, equip, delete)
- `js/hub-shops.js` : 736 lignes (26 fonctions Mon Shop + Alloc + Shops + Universal Shop)
- `js/hub-renders.js` : 300 lignes (renderGacha, renderParty, renderProgression, renderTitles, renderCompanions, renderShop, renderSettings, setTheme)
- `js/hub-character.js` : 200 lignes (renderFullChar + calcul stats/bonus)
- `js/hub-dashboard.js` : 121 lignes (renderDashChar, renderNoChar, renderPlayerWidgets, loadWallet)
**Ordre de chargement :** jaharta.css → hub.css → CDNs → Firebase → hub-dashboard.js → hub-character.js → hub-renders.js → hub-inventory.js → hub-shops.js → `<script>` principal

### P2 — Design system fragmenté ✅ RÉSOLU (2026-04-09)
**Fix appliqué :** `jaharta.css :root` est maintenant la source unique de vérité.
**Changements clés :**
- `--cyan: #4DA3FF` → corrigé à `#00e5ff` (vrai cyan)
- `--blue: #4DA3FF` ajouté (bleu séparé du cyan)
- `--magenta: #ff2a8a` → corrigé à `#ff006e`
- Ajout de : `--gold`, `--red`, `--green`, `--orange`, `--purple`, `--surface`, `--surface2`, `--border`, `--muted`, `--text`, `--text2`, `--text3`, `--font-h`, `--font-b`, `--font-m`, `--glow-blue`, `--glow-gold`
- Aliases legacy conservés pour compatibilité : `--bg-deep`, `--text-primary`, `--font-display`, etc.
**`:root` pages — résidu légitime :**
- `hub.html` : `--text2: #c8cde0`, `--text3: #9aa0b8` (design cyberpunk plus clair, intentionnel)
- `gacha.html` : `--bg: #030816`, `--card`, `--text2`, `--text3` (fond légèrement différent, intentionnel)
- `lore.html` : `--cyan: #00e5cc`, `--rose`, `--sidebar-w` (couleurs lore spécifiques)
- `admin.html` : `--accent`, `--dark`/`--dark2`/`--dark3` (aliases locaux), `--panel`, `--border` (blanc)
- `fiches/pnj/portail.html` : `--r-*` race colors uniquement

### P3 — Console.logs en production ✅ RÉSOLU (2026-04-09)
**Symptôme :** 18+ `console.log` natifs dans le code de prod.
**Fichiers touchés :** `admin.html`, `hub.html`, `gacha.html`, `lore.html`, `racesjouables.html`
**Fix appliqué :** Suppression de tous les `console.log`. `debug.js` intercepte les `console.error` (conservés).
**Note :** `debug.js` n'a pas d'API `.log()` — les infos de debug sont inutiles en prod. Suppression totale = bonne décision.

---

## DESIGN SYSTEM — TOKENS OFFICIELS (à consolider)

La source de vérité devrait être `jaharta.css :root`. État actuel des tokens vs doc :

```css
/* OBJECTIF — tokens à unifier dans jaharta.css */
:root {
  /* Fonds — nommage à consolider */
  --dark:    #04060f;   /* fond principal (CLAUDE.md) */
  --dark2:   #080d1a;   /* fond cartes */

  /* Accents — 3 couleurs piliers */
  --cyan:    #00f5ff;   /* accent fiches (CLAUDE.md) */
  --magenta: #ff006e;   /* accent PNJ (CLAUDE.md) */
  --gold:    #ffd60a;   /* accent portail + admin (CLAUDE.md) */

  /* Textes */
  --text:    #c8e0f0;
  --muted:   #5a7a90;

  /* Polices */
  --font-display: 'Orbitron', sans-serif;
  --font-body:    'Exo 2', sans-serif;
  --font-mono:    'Share Tech Mono', monospace;
}
```

---

## DÉCISIONS ARCHITECTURALES

| Date | Décision | Raison |
|------|----------|--------|
| 2026-04-09 | Audit initial sans modification de code | Comprendre avant de toucher |
| 2026-04-09 | Navbar partagée via `jaharta-nav.js` (vanilla JS, pas de fetch) | GitHub Pages = statique, pas de SSI. JS synchrone après placeholder div évite tout flash. |
| 2026-04-09 | gacha.html : 4 fichiers extraits, gacha.html garde l'INIT section | L'INIT dépend de FX + loadAndShow — court (74L), logique d'orchestration pure. |
| 2026-04-09 | `sleep()` défini dans gacha-fx.js, appelé dans gacha-logic.js | Safe car JS résout les refs globales au runtime, pas au chargement. Ordre : logic avant fx, mais appels dans function bodies. |
| 2026-04-09 | Jamais remplacer HTML imbriqué avec regex `.*?</div>` | Voir BUG-01 — utiliser toujours un parser ou regex avec comptage de depth. |

## RÈGLES ANTI-RÉGRESSION (issues des bugs trouvés)

1. **Toujours vérifier les résidus après migration nav** : `grep -n "menu-link" docs/*.html | grep -v "css\|jaharta-nav"` → doit retourner 0 résultat.
2. **Vérifier les 3 scripts core sur chaque page** : `debug.js`, `constants.js`, `utils.js` présents dans les 9 pages.
3. **Après toute extraction JS** : vérifier que les fonctions cross-files ne sont appelées qu'à l'intérieur de `function` bodies (pas au top-level).
4. **Regex HTML** : pour capturer une `<div>` avec contenu imbriqué, utiliser Python `html.parser` ou BeautifulSoup, jamais `.*?</div>`.

---

## BUGS RÉSOLUS (audit session 3 — 2026-04-09)

### BUG-01 [CRITIQUE] — Nav mobile-menu résiduel sur 5 pages ✅ RÉSOLU
**Problème :** Les 5 pages (index, fiches, pnj, portail, racesjouables) avaient 9-10 lignes
de `<a class="menu-link">` orphelins après `<script src="js/jaharta-nav.js">`.
**Cause racine :** La regex de `migrate_nav.py` utilisait `.*?</div>` non-greedy + re.DOTALL.
Elle s'arrêtait au 1er `</div>` imbriqué (`menu-header-label`), laissant les `<a>` et les
`</div>` fermants du `menu-inner` et `mobile-menu` en dehors du match.
**Correction :** `fix_nav_residuals.py` — regex avec lookahead jusqu'au prochain élément HTML
de page (ni `<a>`, ni `<script>`, ni `<div class="menu`). Résidu supprimé sur 5/5 pages.
**Vérification :** grep `menu-link` résiduel = 0/7 pages. ✓
**Règle post-mortem :** Ne JAMAIS remplacer du HTML avec des divs imbriquées par une regex
`.*?</div>`. Utiliser un parser HTML ou une regex récursive avec comptage de profondeur.

### BUG-02 [CRITIQUE] — hub.html manquait debug.js + constants.js ✅ RÉSOLU
**Problème :** hub.html ne chargeait ni `debug.js` ni `constants.js`.
**Cause racine :** Lors de la décomposition de hub.html en 6 fichiers, ces 2 scripts core
n'ont pas été vérifiés (ils existaient dans les autres pages mais pas hub.html original).
**Correction :** Ajout de `debug.js` + `constants.js` avant les scripts Firebase dans hub.html.
**Vérification :** Tous les scripts core présents sur 9/9 pages. ✓

### BUG-03 [RÉSOLU ANTÉRIEUR] — Nav résiduel lore.html + gacha.html
Nav sur une seule ligne — même cause que BUG-01, corrigé manuellement sur ces 2 fichiers.

### BUG-05 [VISUAL] — racesjouables.html CSS block dupliqué ✅ RÉSOLU (2026-04-09)
**Problème :** Le fichier avait deux blocs `<style>` fusionnés (/* PREVIEW */ + /* ORIGINAL */).
Le bloc ORIGINAL (après) overridait `.nav-logo` sans `display:flex` → logo image + texte mal alignés.
**Correction :** Suppression du bloc ORIGINAL (lignes 63-113). Seul le bloc PREVIEW est conservé.

### BUG-06 [VISUAL] — html element sans background ✅ RÉSOLU (2026-04-09)
**Problème :** jaharta.css `body { background: var(--bg-deep) }` overridé par inline `body { background:transparent }` sur toutes les pages. html sans background → canvas blanc avant kanji-blob.js.
**Correction :** `html { background: var(--bg-deep) }` ajouté dans jaharta.css — fallback si WebGL échoue.

## RÉSULTATS AUDIT COMPLET (2026-04-09)
| Check | Résultat |
|-------|----------|
| Fonctions dupliquées entre fichiers | 0 ✓ |
| Variables globales au top-level (unsafe) | 0 ✓ |
| Références cross-files (runtime-safe) | Toutes dans function bodies ✓ |
| @keyframes résiduels | 0/7 pages ✓ |
| debug.js présent | 9/9 pages ✓ |
| constants.js présent | 9/9 pages ✓ |
| Nav résiduel mobile-menu | 0/7 pages ✓ |
| Ordre chargement scripts correct | ✓ |

---

## PROCHAINES ÉTAPES (roadmap proposée)

### Sprint 1 — Stabilisation (priorité max)
- [x] **P3** Nettoyer les `console.log` de prod ✅ 2026-04-09
- [x] **P2** Unifier les tokens CSS dans `jaharta.css` (1 source de vérité) ✅ 2026-04-09
- [ ] Documenter le schéma Firestore complet (ce qui manque dans CLAUDE.md)

### Sprint 2 — Découpage hub.html
- [x] Extraire `hub-inventory.js` ✅ 763 lignes
- [x] Extraire `hub-shops.js` ✅ 736 lignes (Mon Shop + Alloc + Shops + Universal Shop)
- [x] Extraire `hub.css` ✅ 878 lignes
- [x] Extraire `hub-character.js` ✅ 200 lignes
- [x] Extraire `hub-dashboard.js` ✅ 121 lignes
- [x] Extraire `hub-renders.js` ✅ 300 lignes

### Sprint 3 — UI/UX polish
- [x] Centraliser les `@keyframes` dupliqués dans `jaharta.css` ✅ 2026-04-09
- [x] Navbar partagée `js/jaharta-nav.js` (7 pages, burger inclus) ✅ 2026-04-09
- [x] **gacha.html** décomposé : gacha.css + gacha-blob.js + gacha-logic.js + gacha-fx.js ✅ 2026-04-09
- [x] **Lazy load onglets hub** : `CURRENT_TAB` + `_refreshCurrentTab()` — seul le dashboard charge au boot ✅ 2026-04-09
- [ ] Composants toast/modal partagés

### Sprint 4 — Audit stabilité ✅ TERMINÉ (2026-04-09)
- [x] BUG-01 : nav mobile-menu résiduel sur 5 pages ✅
- [x] BUG-02 : hub.html sans debug.js + constants.js ✅
- [x] BUG-03 : nav résiduel lore.html + gacha.html (ligne unique) ✅
- [x] Audit complet : 0 bug résiduel, système sain ✅

---

## NOTES TECHNIQUES IMPORTANTES

### Firebase — ce qui fonctionne
- Auth Google uniquement côté admin (whitelist `admins/{uid}`)
- `onSnapshot()` temps réel sur toutes les pages publiques
- `jaharta-img-cache.js` : cache localStorage 24h pour URLs Firebase Storage

### Dépendances CDN (ne pas casser)
- GSAP 3.12.5 (hub.html uniquement via CDN cdnjs)
- SortableJS 1.15.2 (hub.html — drag & drop inventaire)
- Tippy.js 6 + Popper.js 2 (hub.html — tooltips)
- Alpine.js 3.14 (admin.html uniquement)
- Three.js (gacha.html — blob)

### Lazy loading onglets hub (Sprint 3 Piste 3)
- `CURRENT_TAB='dashboard'` — variable globale dans hub.html
- `showTab(id)` met à jour `CURRENT_TAB=id` avant d'appeler `LAZY[id]()`
- `_refreshCurrentTab()` — appelé à la fin de `loadCharacter()` et `loadPlayer()` pour re-rendre l'onglet actif si non-dashboard
- `LAZY{}` map : seuls dashboard + personnage se chargent selon l'onglet actif au boot
- **Règle** : ne jamais appeler `renderFullChar()`, `renderProgression()`, `renderGacha()`, `renderSettings()` directement dans loadCharacter/loadPlayer — laisser LAZY le faire

### Ordre d'inclusion des scripts (OBLIGATOIRE)
```
debug.js → constants.js → utils.js → <script type="module">
```

### Globals window exposés par les modules Firebase
`window._db`, `window._storage`, `window._isAdmin`, `window._doc`, `window._updateDoc`, `window._deleteDoc`

### Sécurité — points névralgiques
- `sanitize()` doit être appelé sur TOUS les inputs avant Firestore
- `compressImage()` avant tout upload Firebase Storage
- `AntiSpam.canSubmit()` avant toute soumission de fiche
