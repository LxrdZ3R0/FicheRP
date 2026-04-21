# SITE_ARCHITECTURE.md — Guide d'architecture

> **Restructure 2026-04-21** — Organisation par domaine (voir commits R1→R8).

## Arborescence

```
docs/
├── index.html                  Accueil NORMAL (reste racine — GitHub Pages)
├── CNAME · CLAUDE-CASINO.md · SITE_ARCHITECTURE.md (ce fichier)
│
├── pages/                      Pages HTML NORMAL (fiches, pnj, portail, lore,
│                               racesjouables, bestiaire, gacha, hub, casino, admin)
├── irp/                        Branche IRP (index-irp, fiches-irp, gacha-irp, hub-irp)
│
├── features/<domain>/          Logique métier (fiches · gacha · hub · lore · races
│                               casino · landing · admin)
├── shared/lib/                 constants · utils · debug · jaharta-cache
│                               jaharta-img-cache · stats-caps · irp-mode · kanite-wallet
├── shared/components/          jaharta-nav · jaharta-motion · page-transition
│                               music-player · auth-badge · kanji-blob
├── styles/                     jaharta · hub · hub-achievements · gacha
│                               bestiaire-card · casino · irp-theme
└── assets/{img,data}/
```

## Règle de chemins relatifs

| Depuis | Vers `shared/`, `features/`, `styles/`, `assets/` | Vers `index.html` | Siblings |
|--------|---------------------------------------------------|-------------------|----------|
| `index.html` (racine) | `shared/...` | `index.html` | `pages/fiches.html` |
| `pages/*.html` | `../shared/...` | `../index.html` | `fiches.html` |
| `irp/*.html` | `../shared/...` | `../index.html` | `fiches-irp.html`, croix-branche `../pages/fiches.html` |

`shared/components/jaharta-nav.js` et `shared/lib/irp-mode.js` détectent automatiquement la position via `location.pathname.split('/').filter(Boolean)` → `parent === 'pages' || 'irp'` → `toRoot = '../'`. Les tableaux `PAGES_NORMAL`/`PAGES_IRP` sont construits dynamiquement : `toRoot + 'pages/<slug>.html'`.

## Branches

### NORMALE (aucun code IRP)
| Page | Chemin | Rôle |
|------|--------|------|
| Accueil | `index.html` | Footer ◆ → modal code → redirige vers `irp/index-irp.html` |
| Hub | `pages/hub.html` | Hub joueur (auth /link). 12 onglets. |
| Gacha | `pages/gacha.html` | Gacha Nexus (bannières normales). |
| Casino | `pages/casino.html` | Multijoueur temps réel. |
| Fiches / PNJ / Portail / Races / Bestiaire / Lore / Admin | `pages/*.html` | |

### IRP (fork permanent)
| Page | Chemin | Rôle |
|------|--------|------|
| Accueil IRP | `irp/index-irp.html` | Thème violine, nav vers `irp/*`. |
| Hub IRP | `irp/hub-irp.html` | Collections `irp_*`, Jahartites. |
| Gacha IRP | `irp/gacha-irp.html` | Bannières IRP. |
| Fiches IRP | `irp/fiches-irp.html` | |

**Seul point de contact :** bouton ◆ dans footer de `index.html` → code `JAHARTA02irp` → `irp/index-irp.html`.

## Scripts par page

### Bootstrap commun (dans l'ordre, inclusions directes)
`shared/lib/debug.js` → `shared/lib/constants.js` → `shared/lib/utils.js` → `shared/components/jaharta-nav.js` → `shared/lib/jaharta-cache.js`

### `pages/hub.html`
`features/hub/hub-dashboard.js` → `hub-character.js` → `hub-renders.js` → `hub-inventory.js` → `hub-shops.js` → `hub-achievements.js` → `hub-core.js` → `shared/components/music-player.js`

### `irp/hub-irp.html`
Même stack que hub.html + `shared/lib/irp-mode.js` + `features/hub/hub-irp.js` (override collections).

### Gacha (`pages/gacha.html` / `irp/gacha-irp.html`)
`features/gacha/gacha-logic.js` (ou `gacha-irp-logic.js`) → `gacha-fx.js` → `gacha-blob.js` / `shared/components/kanji-blob.js`. Sur `gacha-irp.html`, `window._irpMode = true` est forcé avant `gacha-irp-logic.js`.

### Casino (`pages/casino.html`)
Firebase compat → `features/casino/casino-core.js` → `casino-roulette.js` → `casino-blackjack.js` → `casino-poker.js` → `casino-flip.js`. Voir [CLAUDE-CASINO.md](CLAUDE-CASINO.md).

## Firebase — Collections clés

| Collection | Usage |
|------------|-------|
| `fiches/{id}` · `pnj/{id}` · `admins/{uid}` · `logs/{id}` | Fiches / staff |
| `users/{discordId}` · `players/{uid}` · `economy/{uid_charId}` | Joueurs / économie |
| `casino_config/main` · `casino_tables/{id}` · `casino_logs/{id}` | Casino |
| `gacha_config/banners` · `gacha_pulls/{id}` | Gacha (bot push onSnapshot) |
| `config/achievements_config` · `achievements_user/{discord_id}` | Succès |
| `irp_pnj` · `irp_bestiaire` · `irp_characters` · `irp_flesh_marks` | Branche IRP |

## Timing bot ↔ site
- **Bot push :** h:00, h:15, h:30, h:45
- **Site refresh succès :** h:03, h:18, h:33, h:48 (3 min après le bot)
- **Bannières gacha :** `onSnapshot` (temps réel)
