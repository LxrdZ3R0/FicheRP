# SITE_ARCHITECTURE.md — Guide rapide pour Claude

## Vue d'ensemble
Site communautaire Jaharta RP. GitHub Pages (`/docs`), Firebase backend, JS vanilla.

## Pages et leurs fichiers

### index.html — Page d'accueil
- Hero header animé (JAHARTA en gradient)
- Bouton secret IRP dans le footer (◆) → ouvre modal code → redirige vers `hub.html?mode=irp`
- Scripts: `jaharta-nav.js`, `irp-mode.js`, `music-player.js`, `jaharta-motion.js`

### hub.html — Hub joueur (auth requise via /link code)
- 12 onglets: Dashboard, Personnage, Inventaire, Gacha, Party, Progression, Titres, Compagnons, Mon Shop, Shops, Universal Shop, Paramètres, Succès
- **Scripts (ordre critique):**
  1. `debug.js` → `constants.js` → `utils.js` → `jaharta-cache.js` → `jaharta-img-cache.js`
  2. `hub-dashboard.js` → `hub-character.js` → `hub-renders.js` → `hub-inventory.js` → `hub-shops.js` → `hub-achievements.js`
  3. `hub-core.js` (noyau: auth, Firebase, state, loaders, tabs)
  4. `music-player.js` → `irp-mode.js` → `hub-irp.js`
- **State global:** `UID`, `CHAR`, `CHAR_ID`, `PLAYER`, `INV_DATA`, `ALL_ITEMS_DATA`, `PARTY_DATA`
- **Mode IRP:** activé par `?mode=irp` ou localStorage. `hub-irp.js` override les collections Firebase vers `irp_*`.

### gacha.html — Système Gacha Nexus
- Auth par code `/link`
- Scripts: `gacha-logic.js`, `gacha-fx.js`, `gacha-blob.js` (Three.js), `kanji-blob.js`
- Bannières chargées depuis `gacha_config/banners` en Firestore
- Mode IRP: bannières depuis `irp_gacha_banners`

### fiches.html — Fiches personnages joueurs
- Script principal: `fiches.js`
- Web Component: `<jaharta-card>` (`jaharta-card.js`)

### admin.html — Panel admin (whitelist Firebase)
- Auth Google + vérification `admins/{uid}`
- Onglets: Fiches, PNJ, Lore, Bestiaire, Logs
- Alpine.js pour réactivité des onglets

## CSS
| Fichier | Contenu |
|---------|---------|
| `css/jaharta.css` | Thème global, variables CSS (source de vérité), classes `.jh-*` |
| `css/hub.css` | Styles spécifiques au hub (stats, inventaire, slots, etc.) |
| `css/hub-achievements.css` | Styles du système de succès |
| `css/gacha.css` | Styles page gacha |
| `css/bestiaire-card.css` | Cartes bestiaire |

## Firebase Collections principales
| Collection | Contenu |
|------------|---------|
| `active_characters/{discord_id}` | Personnage actif (character_id) |
| `characters/{char_uuid}` | Données personnage complet |
| `players/{discord_id}` | Navarites, notoriety, theme... |
| `inventories/{uid}_{char_id}` | Items + equipped_assets |
| `gacha_config/banners` | Bannières actives (push par bot) |
| `gacha_config/banners_raw` | Données brutes bannières |
| `config/achievements_config` | Définitions succès (push par bot) |
| `config/achievements_icons` | URLs images custom des succès (admin) |
| `achievements_user/{discord_id}` | Succès débloqués par joueur |
| `irp_active_characters/{discord_id}` | Personnage IRP actif |
| `irp_gacha_banners/{id}` | Bannières gacha IRP |

## Mode IRP — Architecture
- **Point d'entrée unique:** bouton secret `◆` dans footer de `index.html`
- **Activation:** localStorage `jaharta_irp_mode=true` + query param `?mode=irp`
- **Pages IRP:** UNIQUEMENT `hub.html` et `gacha.html` (les autres pages ignorent l'IRP)
- `irp-mode.js`: thème CSS violine, glitch JAHARTA↔ATRAHAJ, modal code
- `hub-irp.js`: override collections vers `irp_*`, chargement jahartites, onglets IRP

## Systèmes de rafraîchissement
- **Bot push:** toutes les 15 min, le bot pousse les définitions de succès et vérifie tous les joueurs
- **Bannières:** push par bot toutes les 6h + rotation auto tous les 7 jours
- **Site refresh:** succès et bannières auto-refresh toutes les 18 min (3 min offset vs bot)
