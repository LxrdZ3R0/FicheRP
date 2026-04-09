# MEMORY.md — JahartaRP Project Memory
> Fichier de mémoire dynamique. Se met à jour après chaque session de travail significative.
> Format : décisions prises, bugs résolus, état actuel, prochaines étapes.

---

## ÉTAT ACTUEL DU PROJET
**Dernière mise à jour :** 2026-04-09
**Branche :** main
**Phase :** Sprint 1 — Stabilisation — P3 + P2 résolus ✓

### Architecture globale
- GitHub Pages → `/docs` (auto-deploy sur `main`)
- Backend : Firebase Firestore + Storage + Auth (Google uniquement)
- Frontend : HTML5 / CSS3 / JS vanilla — zéro bundler, imports ESM depuis CDN
- Pas de framework JS sauf Alpine.js dans `admin.html` (onglets réactifs)
- Three.js + GSAP dans `gacha.html` (blob) et `hub.html` (scan silhouette)

### Fichiers clés et tailles (lignes)
| Fichier | Lignes | Statut |
|---------|--------|--------|
| `hub.html` | 4042 | CRITIQUE — monolithe |
| `gacha.html` | 2662 | GRAVE |
| `css/jaharta.css` | 2450 | Gonflé mais acceptable |
| `fiches.html` | 1363 | Limite haute |
| `lore.html` | 1296 | Limite haute |
| `racesjouables.html` | 1137 | OK |
| `index.html` | 851 | OK |
| `pnj.html` | 793 | OK |
| `admin.html` | 559 | OK |

---

## PROBLÈMES CRITIQUES IDENTIFIÉS

### P1 — hub.html : monolithe de 4042 lignes ✅ PARTIELLEMENT RÉSOLU (2026-04-09)
**Avant :** 4042 lignes tout dans un seul fichier.
**Après décomposition :**
- `hub.html` : 1670 lignes (−59% ✓)
- `css/hub.css` : 878 lignes (CSS extrait)
- `js/hub-inventory.js` : 763 lignes (23 fonctions inventaire : drag/drop, slots, tooltips, equip, delete)
- `js/hub-shops.js` : 736 lignes (26 fonctions Mon Shop + Alloc + Shops + Universal Shop)
**Ordre de chargement :** jaharta.css → hub.css → CDNs → Firebase → hub-inventory.js → hub-shops.js → `<script>` principal
**Reste à extraire (Sprint 2 suite) :** renderDashChar + renderPlayerWidgets → hub-dashboard.js (~100 lignes), renderFullChar → hub-character.js (~200 lignes)

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
| — | — | — |

---

## BUGS RÉSOLUS

_Aucun pour l'instant — projet en phase d'audit._

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
- [ ] Extraire `hub-character.js` (renderFullChar, ~200 lignes)
- [ ] Extraire `hub-dashboard.js` (renderDashChar, renderPlayerWidgets, ~100 lignes)

### Sprint 3 — UI/UX polish
- [ ] Unifier les composants répétés (navbars, toasts, modals)
- [ ] Améliorer les animations GSAP existantes (ne pas casser l'existant)
- [ ] Optimiser le chargement (lazy load des onglets hub)

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
