# CLAUDE.md — Jaharta RP

Site communautaire pour le serveur Discord RP **Jaharta**.
Hébergé sur GitHub Pages (`/docs`), backend Firebase, zéro framework JS.

---

## Stack

| Couche | Techno |
|--------|--------|
| Hébergement | GitHub Pages — dossier `/docs` (auto-deploy sur `main`) |
| Base de données | Firebase Firestore (temps réel via `onSnapshot`) |
| Stockage | Firebase Cloud Storage |
| Auth | Firebase Auth (Google uniquement — panel admin) |
| Frontend | HTML5 / CSS3 / JS vanilla — aucun bundler |
| Alpine.js 3.14 | **Uniquement** dans `admin.html` (onglets réactifs) |
| Three.js + GSAP | Blob 3D + animations gacha (`kanji-blob.js`, `gacha.html`) + scan silhouette hub (`hub.html`) |
| Web Component | `<jaharta-card>` — `js/jaharta-card.js` |

---

## Structure — fichiers clés

```
docs/
├── index.html           Accueil + nav
├── fiches.html          Cartes personnages joueurs (PC)
├── pnj.html             Personnages non-joueurs
├── portail.html         Portail lore + carte monde
├── lore.html            Lore complet — 7 sections (CRUD admin intégré)
├── racesjouables.html   Encyclopédie des 42 races
├── gacha.html           Système Gacha Nexus (auth requis)
├── hub.html             Hub joueur — 12 onglets (auth requis)
├── admin.html           Panel staff (whitelist Firestore)
│
├── css/
│   └── jaharta.css      Thème global partagé (variables CSS)
│
└── js/
    ├── constants.js         window.RACES / window.RANKS / window.RACES_SPECIFIC
    ├── utils.js             sanitize(), compressImage(), AntiSpam, Skeleton, showToast()
    ├── jaharta-card.js      Web Component <jaharta-card> (tilt 3D, scramble, sparkle)
    ├── jaharta-img-cache.js Cache localStorage des URLs d'images Firestore (TTL 24h)
    ├── debug.js             Logger flottant (localStorage, bas-droit)
    ├── kanji-blob.js        Blob Three.js pour gacha
    └── page-transition.js   Overlay de chargement
```

---

## Ordre d'inclusion obligatoire des scripts

```html
<script src="js/debug.js"></script>      <!-- 1. capture toutes les erreurs -->
<script src="js/constants.js"></script>  <!-- 2. RACES, RANKS globaux -->
<script src="js/utils.js"></script>      <!-- 3. sanitize, showToast, etc. -->
<script type="module"> ... </script>     <!-- 4. Firebase ESM + logique page -->
```

---

## Firebase

**Config publique** (la sécurité repose sur les Firestore Security Rules) :

```js
const firebaseConfig = {
  apiKey:            "AIzaSyAru7qZX8Gu_b8Y3oNDV-a5PmkrrkRjkcs",
  authDomain:        "jaharta-rp.firebaseapp.com",
  projectId:         "jaharta-rp",
  storageBucket:     "jaharta-rp.firebasestorage.app",
  messagingSenderId: "217075417489",
  appId:             "1:217075417489:web:4d1e2df422a5cd42411a30"
};
```

**Collections principales :**

| Collection | Contenu |
|------------|---------|
| `fiches/{id}` | Personnages joueurs — status: `en_attente\|validee\|rejetee` |
| `pnj/{id}` | PNJ avec motivations, danger, catégorie |
| `pnj_filters/{id}` | Tags de filtre personnalisés PNJ |
| `admins/{uid}` | Whitelist staff — role: `admin\|modo` |
| `logs/{id}` | Historique actions admin |
| `users/{discordId}` | Données joueurs (navarites, gacha, inventaire…) |
| `lore_empires/{id}` | Empires — factions, territoires, villes |
| `lore_organisations/{id}` | Organisations — ordres, guildes, cabales |
| `lore_dynasties/{id}` | Dynasties — lignées, généalogie, membres |
| `lore_histoire/{id}` | Événements historiques majeurs |
| `lore_pantheon/{id}` | Panthéon — primordiaux, cultes |
| `lore_chronologie/{id}` | Chronologie — frise des ères |
| `lore_glossaire/{id}` | Glossaire — termes et définitions |

**Globals window exposés** dans les modules Firebase pour les scripts non-module :
`window._db`, `window._storage`, `window._isAdmin`, `window._doc`, `window._updateDoc`, `window._deleteDoc`

---

## Cache images (`jaharta-img-cache.js`)

Cache localStorage des URLs d'images Firebase Storage, TTL 24 h.

```js
window.JImgCache.get(key)               // → url|null (depuis le cache)
window.JImgCache.set(key, url)          // écrit en cache
window.JImgCache.applyTo(img, key, url) // affiche en cache-first, rafraîchit si différent
window.JImgCache.invalidate(key)        // invalide une entrée
window.JImgCache.stats()                // {total, expired}
```

**Clés par type de document :**
- `fc_{id}` — fiches joueurs (fiches.html, jaharta-card.js)
- `char_{id}` — personnage hub (hub.html)
- `pnj_{id}` — PNJ (pnj.html)

---

## Systèmes principaux

### Gacha Nexus (`gacha.html`)
- Auth par code `/link` Discord (12 chars) → lookup `users/{id}/linkCodes/{code}`
- Monnaie : **Navarites** (NAV) — déduites côté serveur (bot Discord)
- Tirages : ×1 / ×5+bonus / ×10+bonus+Epic garantie
- Pity : soft (Epic) + hard (Legendary) + streak Navarites
- Animations : blob Three.js (`bSetCol`, `bExplode`, `bAddOrbital`) + canvas particles + GSAP flip
- **⚠ SUPPRIMÉ** : champs `vip_boost`, `specialz_leg_plus`, `specialz_full_leg` ne sont **plus** écrits dans `gacha_pulls` — le bot doit calculer ces flags lui-même côté serveur

### Hub joueur (`hub.html`)
- Même auth que gacha
- 12 onglets : Dashboard, Personnage, Inventaire, Gacha, Party, Progression, Titres, Compagnons, Mon Shop, Shops, Universal Shop, Paramètres
- Toutes les données en temps réel via `onSnapshot()`

#### Onglet Inventaire — UI Cyberpunk 2077
- **Split-view** : panneau personnage (520px gauche) + grille items (droite)
- **CDNs supplémentaires dans `<head>`** : SortableJS 1.15.2, Tippy.js 6, Popper.js 2, **GSAP 3.12.5**
- **Panneau personnage** : layout 3 colonnes `.cyb-panel` (168px | SVG center | 168px) :
  - Colonne GAUCHE (haut → bas) : TÊTE (`sz-tete`) · COU ET OREILLES (`sz-cou`+`sz-oreilles`) · ARMURE & CAPE (`sz-torse`+`sz-dos`+`sz-bras`+`sz-poignets`) · MAINS & DOIGTS (`sz-mains`+`sz-doigts`) · SPÉCIAUX (`sz-special`)
  - Colonne DROITE (haut → bas) : VISAGE (`sz-visage`) · ARMES (`sz-armes_h`+`sz-armes_l`) · JAMBES (`sz-jambes`) · PIEDS (`sz-pieds`)
  - **SVG centre** (`#cyb-figure-svg`, viewBox `0 0 280 540`) : corps holographique rouge/cyan translucide (`fill rgba(160,25,20,0.18)` + `stroke rgba(0,229,255,…)`), nœuds orange, yeux lumineux, réacteur thoracique rouge
  - `<filter id="glowCyan">` / `<filter id="glowOrange">` / `<filter id="glowRed">` dans `<defs>`
  - `<linearGradient id="scanRed">` + `<clipPath id="bodyClip">` pour le scan beam
  - `<rect id="cyb-scan-beam">` animé par `initCharScanAnimation()` (GSAP `fromTo attr.y`, -26 → 542, 4 s)
  - Lignes de connexion SVG : 5 lignes horizontales pointillées GAUCHE (y=54,162,270,378,486) + 4 DROITE (y=68,202,338,472)
- **Slots** (15 IDs) : `slot-cell empty-cell` (pulsant) / `slot-cell occupied` (lueur dorée) — drag & drop SortableJS vers les cellules `sz-*`
- **Suppression items** : bouton poubelle sur chaque carte au survol + bouton dans le panneau détail → `openDeleteModal(itemId, event)` → modal de confirmation avec contrôle quantité → `confirmDelete()` écrit Firestore `items` (sans toucher `equipped_assets`)
- **Grille droite** : filtres catégorie/rareté/slot, recherche, tri, drag & drop (SortableJS), tooltips (Tippy.js)
- **Portefeuille** : `PLAYER.golden_eggs` peut être un objet Firestore — extraction sécurisée via `Object.values(_ge).find(v=>typeof v==='number')`
- **Fonctions JS clés** : `renderInventory()`, `renderCharacterPanel()`, `initCharScanAnimation()`, `renderItemsGrid()`, `initDragDrop()`, `initTooltips()`, `toggleEquip()`, `showItemDetail()`, `closeItemDetail()`, `openDeleteModal()`, `closeDeleteModal()`, `confirmDelete()`

### Lore (`lore.html`)
- Page publique avec sidebar de navigation et 7 sections : Empires, Organisations, Dynasties, Histoire, Panthéon, Chronologie, Glossaire
- Données temps réel via `onSnapshot()` sur les collections `lore_*` en Firestore
- Accessible depuis la card "Lore de Jaharta" dans `portail.html`
- **CRUD admin intégré** : les admins whitelistés Firestore (`admins/{uid}`) voient des boutons "+" par section + boutons supprimer sur chaque carte
- Auth Firebase (Google) via `getAuth()` + vérification `admins/{uid}` — pas de badge admin visible
- Modal de création avec champs dynamiques par catégorie (même structure que `admin.html`)
- Sécurité : `sanitize()` sur tous les inputs, `escH()` pour l'affichage, `isAdmin()` dans les Firestore rules

### Panel Admin (`admin.html`)
- Accès : lien discret `⚙ STAFF` dans le footer de `index.html` uniquement — **absent de toutes les navbars**
- Auth Firebase (Google uniquement via `signInWithPopup`) + vérification `admins/{uid}` en Firestore
- Si l'UID n'existe pas dans `/admins` → `auth.signOut()` immédiat + message "Accès refusé"
- Rôle `admin` : supprimer fiches + voir logs
- Rôle `modo` : lecture seule (fiches + PNJ)
- Onglets : **Fiches** · **PNJ** · **Lore** · **Logs** (Logs visible admins uniquement)
- Onglet **Lore** : 7 sous-onglets (Empires, Organisations, Dynasties, Histoire, Panthéon, Chronologie, Glossaire) — CRUD complet vers les collections `lore_*` en Firestore, données affichées en temps réel sur `lore.html` via `onSnapshot`
- Alpine.js pour la réactivité des onglets (`logsVisible` contrôle l'onglet Logs)
- **⚠ SUPPRIMÉ** : bypass VIP Discord IDs — `window._isAdmin` est exclusivement contrôlé par Firebase Auth
- **⚠ SUPPRIMÉ** : onglet Gacha (API bot externe) + onglet Races (redondant)

---

## Design system

**Variables CSS globales** (`jaharta.css` `:root`) :
```css
--cyan:    #00f5ff   /* accent fiches + gacha */
--magenta: #ff006e   /* accent PNJ */
--gold:    #ffd60a   /* accent portail + admin */
--dark:    #04060f   /* fond principal */
--dark2:   #080d1a   /* fond cartes */
--text:    #c8e0f0
--muted:   #5a7a90
```

Chaque page surcharge `--accent` dans son `<style>` inline.

**Polices** : Orbitron (titres) · Exo 2 (corps) · Share Tech Mono (UI/mono)

**Rangs** (14 niveaux, F → Z) : rangs S+ ont une animation CSS prismatique pulsante.

**Groupes de races** (7) : Humanoids · Zooids · Mythical Zooids · Demons · Artificial · Semi-Liquid · Undead

---

## Conventions

- **Immutabilité** : créer de nouveaux objets, ne pas muter.
- **Sanitize** : appeler `sanitize()` sur tout input avant Firestore.
- **Pas de `<form>`** : tout est géré via `onclick` + JS.
- **Pas de bundler** : imports ESM directs depuis CDN gstatic.
- **Real-time first** : préférer `onSnapshot()` à `getDocs()` pour l'UI.
- **Sections commentées** CSS : `/* ══ Titre ══ */` · JS : `/* ── Titre ── */`
- **Nommage** : variables et commentaires en **français** (adapté communauté FR).
- **Taille fichiers** : < 800 lignes par fichier, fonctions < 50 lignes.
- **Pas de logs** : `showToast()` pour feedback UX, `debug.js` pour erreurs dev.

---

## Tests en local

Firebase ESM requiert un serveur HTTP :

```bash
cd docs
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Tâches fréquentes

**Ajouter une race :**
1. `js/constants.js` → `window.RACES` + `window.RACES_SPECIFIC`
2. `racesjouables.html` → `.race-card` dans le bon `.race-group`
3. `fiches.html` → bouton filtre si nécessaire

**Ajouter un champ à une fiche :**
1. `fiches.html` modal soumission + `submitCard()` + `openEditFiche()`
2. `js/jaharta-card.js` `_render()` pour l'affichage
3. `admin.html` `renderTable()` si besoin dans le panel
4. `README.md` schéma Firestore

**Ajouter un admin :**
1. Firebase Console → Authentication → créer l'utilisateur
2. Firestore → `admins/{uid}` → `{ role: "admin", name: "...", email: "..." }`

**Déployer :**
Push sur `main` → GitHub Pages auto-deploy (délai ~1 min).
