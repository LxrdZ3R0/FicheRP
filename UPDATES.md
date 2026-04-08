# UPDATES — Journal des modifications importantes

> Ce fichier documente les changements structurels significatifs du projet.
> Il est destiné à être lu par un développeur humain **ou une IA** reprenant le projet.
> Les modifications mineures (UI, textes) ne sont pas consignées ici.

---

## [2026-04-07] — Audit sécurité complet : XSS, TOCTOU, isAdmin, sessions

### Contexte

Audit de sécurité full-stack du projet par un Senior Full-Stack Developer + Cybersecurity Expert. Neuf fichiers corrigés, quatre classes de vulnérabilités éliminées.

---

### Vulnérabilités corrigées

#### CRITIQUE — XSS stocké via innerHTML dans `admin.html`

**Avant** : `renderTable()`, `renderPNJTable()`, `renderLogs()` interpolaient directement les données Firestore dans des template literals insérés via `innerHTML`. Un nom ou une description contenant `<img src=x onerror=...>` s'exécutait à l'affichage.

**Après** :
- Ajout des helpers `escHtml(s)` et `safeHref(url)` en tête de script
- Les trois fonctions de rendu reécrites avec `escHtml()` sur chaque champ Firestore
- Les boutons `onclick="deleteFiche('${id}')"` remplacés par `btn.addEventListener('click', () => ...)`

---

#### CRITIQUE — `javascript:` protocol injection dans `jaharta-card.js` et `fiches.html`

**Avant** : `a.href = l.h || l.url || "#"` sans validation — un lien `javascript:alert(1)` stocké en Firestore s'exécutait au clic.

**Après** : validation systématique par `new URL()` — seuls `https:` et `http:` acceptés. `rel="noopener noreferrer"` ajouté sur tous les liens externes.

---

#### CRITIQUE — TOCTOU (race condition) sur les codes Discord dans `hub.html` et `gacha.html`

**Avant** : la vérification du code Discord faisait un `getDoc()` puis un `deleteDoc()` en deux opérations séparées — un code pouvait être utilisé deux fois simultanément.

**Après** : `db.runTransaction()` rend la lecture + suppression atomiques. Le TTL d'expiration est vérifié à l'intérieur de la transaction.

---

#### CRITIQUE — `isAdmin()` retournait `true` pour tout compte Google dans `firestore.rules`

**Avant** : `function isAdmin() { return request.auth != null; }` — n'importe quel compte Google pouvait écrire dans les collections admin.

**Après** :
```javascript
function isAdmin() {
  return request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```
Réécriture complète de `firestore.rules` avec whitelist Firestore vérifiée côté serveur, `ficheIsClean()` pour valider les soumissions joueurs, et field-whitelisting sur les logs.

---

#### ÉLEVÉ — `window._isAdmin = !!user` dans `auth-badge.js` et `fiches.html`

**Avant** : tout utilisateur Firebase Auth authentifié recevait `window._isAdmin = true`.

**Après** : `getDoc(doc(db, 'admins', user.uid))` — seul un UID présent dans la whitelist Firestore donne `isAdmin = true`.

---

#### ÉLEVÉ — XSS dans le panneau debug flottant (`debug.js`)

**Avant** : `list.innerHTML = logs.map(e => \`...\${e.msg}\${e.detail}...\`)` — les messages d'erreur contenant du HTML s'exécutaient.

**Après** : helper `esc(s)` appliqué à tous les champs interpolés dans le panneau debug.

---

#### MOYEN — Validation d'URL manquante dans `jaharta-img-cache.js`

**Avant** : `set(key, url)` acceptait n'importe quelle URL en cache, dont des `data:` ou `javascript:`.

**Après** : `_isSafeUrl(url)` vérifie que l'URL commence par `https://firebasestorage.googleapis.com/` ou `https://storage.googleapis.com/`. Appliqué à la lecture ET à l'écriture du cache.

---

#### MOYEN — Absence de TTL sur les sessions localStorage (`hub.html`, `gacha.html`)

**Avant** : les sessions Discord (hub/gacha) persistaient indéfiniment en localStorage.

**Après** : TTL de 7 jours stocké dans `session._exp`. `getSess()` invalide et efface automatiquement les sessions expirées.

---

#### MOYEN — Storage Rules sans contraintes de taille ni de type (`storage.rules`)

**Avant** : `allow write: if request.auth != null` sans restriction de taille ou de content-type.

**Après** : limites de taille (1–20 Mo selon le dossier) et filtres `contentType` ajoutés. Note explicite sur la limitation des Storage Rules (impossibilité de vérifier la whitelist Firestore — nécessite des custom claims Firebase Auth pour un contrôle strict).

---

### Fichiers modifiés

| Fichier | Correctifs |
|---------|-----------|
| `docs/admin.html` | `escHtml()`, `safeHref()`, refonte complète des 3 fonctions de rendu |
| `docs/js/debug.js` | `esc()` sur tous les champs du panneau flottant |
| `docs/js/jaharta-card.js` | Validation URL + `rel="noopener noreferrer"` |
| `docs/fiches.html` | Validation URL + vérification whitelist `isAdmin` |
| `docs/js/jaharta-img-cache.js` | `_isSafeUrl()` sur lecture et écriture |
| `docs/js/auth-badge.js` | Vérification whitelist Firestore pour `_isAdmin` |
| `docs/hub.html` | Transaction atomique + TTL session |
| `docs/gacha.html` | Transaction atomique + TTL session + correction doublon `getSession` |
| `firestore.rules` | Réécriture complète — `isAdmin()`, `ficheIsClean()`, field whitelists |
| `storage.rules` | Limites taille/type, documentation limitation custom claims |

---

## [2026-04-07] — Refactoring navigation & restructuration panel admin

### Contexte

Le bouton d'accès au panel admin était visible en pleine barre de navigation sur toutes les pages du site, ce qui n'avait aucun sens : il s'agit d'un accès réservé aux membres du staff, pas d'un lien de navigation public. Par ailleurs, `admin.html` contenait des onglets et scripts devenus obsolètes (API bot externe, onglet Races redondant) ainsi qu'un double bloc CSS.

### Fichiers modifiés

#### `docs/index.html`

**Avant** : lien `<a href="admin.html" class="admin-badge" id="admin-badge">ADMIN</a>` affiché dans la barre de navigation principale, et lien "Admin" dans le menu burger mobile (item 08).

**Après** :
- Badge ADMIN supprimé de la navbar
- Lien supprimé du menu burger mobile
- Ajout d'un lien discret `⚙ STAFF` dans la zone copyright du footer, à 40% d'opacité — visible uniquement pour qui sait où chercher

---

#### `docs/fiches.html`, `pnj.html`, `portail.html`, `racesjouables.html`, `gacha.html`, `hub.html`

**Avant** : chaque page avait les trois composants admin dans sa nav : `.nav-admin-link` dans `.nav-links`, `.admin-badge` entre le nav-links et le burger, et le lien `#menu-admin-link` dans le menu mobile.

**Après** : tous supprimés sur les 6 pages. Ces pages ne contiennent plus aucune référence à `admin.html` dans leur navigation.

---

#### `docs/admin.html`

**CSS — supprimé** : le bloc `/* NEW ADMIN DESIGN */` (~85 lignes) était un doublon du bloc `/* ORIGINAL ADMIN CSS */` qui le suivait dans le même `<style>`. Les deux blocs redéfinissaient les mêmes classes (`.login-box`, `.admin-header`, `.admin-stats`, etc.), le bloc ORIGINAL l'emportant en cascade. Seul le bloc ORIGINAL est conservé.

**Onglet Gacha — supprimé** :
- Connectait à une API bot externe (`http://87.106.63.126:5039`) via JWT stocké en localStorage
- Permettait de forcer la rotation des bannières et d'assigner des images
- Fonctions supprimées : `gachaFetch()`, `gachaLoadAdmin()`, `gachaForceRotation()`, `gachaSetBanners()`, `gachaSetImage()`
- Éléments HTML supprimés : `#tab-gacha`, `#gacha-admin-status`, `#gacha-rotation-grid`, les 4 `<select>` de sélection de bannières, `#gacha-img-url`

**Onglet Races — supprimé** :
- Affichait une grille read-only des races depuis `window.RACES_SPECIFIC` et renvoyait vers `racesjouables.html`
- Aucune action admin réelle — totalement redondant avec la page publique
- Fonctions supprimées : `renderAdminRaces()` + `setTimeout(renderAdminRaces, 500)`
- Éléments HTML supprimés : `#tab-races`, `#admin-races-grid`

**Scripts inutiles — supprimés** :
- `js/script.js` — script de navigation du site public (toggle burger), sans objet dans le panel admin
- `js/kanji-blob.js` — animation Three.js du blob Gacha, sans objet dans le panel admin
- `js/music-player.js` — lecteur audio, sans objet dans le panel admin
- Script inline `nav-toggle` (IIFE) — référençait `nav-toggle` et `nav-links` qui n'existent pas dans admin.html

**État Alpine.js** : `racesVisible` supprimé de `x-data` et de `_setAdminTab()`. Seul `logsVisible` (contrôle l'onglet Logs, visible admins uniquement) subsiste.

**Panel restant : 3 onglets actifs** — Fiches · PNJ · Logs

---

### État après modification

| Élément | Avant | Après |
|---------|-------|-------|
| Accès admin depuis les pages publiques | Badge dans la navbar de **toutes** les pages | Lien discret dans le footer de `index.html` **uniquement** |
| Onglets admin | Fiches · PNJ · Races · Gacha · Logs | **Fiches · PNJ · Logs** |
| CSS admin.html | 2 blocs CSS dupliqués | 1 seul bloc CSS |
| Scripts inclus dans admin.html | debug + constants + utils + Alpine + script.js + page-transition + kanji-blob + music-player | **debug + constants + utils + Alpine + page-transition** |

---

## [2026-04-06] — Refactoring sécurité : suppression du système VIP Discord IDs

### Contexte (pourquoi ce changement était urgent)

Le projet est hébergé sur GitHub Pages (pur client-side). La seule couche de sécurité réelle est constituée des **Firestore Security Rules**. Or, un système de "bypass admin" existait côté client depuis une version antérieure : un tableau de 6 Discord IDs (`VIP_IDS`) accordait automatiquement `window._isAdmin = true` à quiconque possédait (ou forgeait) une session localStorage avec un ID correspondant. Ce mécanisme a été exploité pour accéder frauduleusement au panel admin et à des fonctionnalités de boost gacha.

### Fichiers modifiés

#### `docs/js/auth-badge.js`

**Avant** : `onAuthStateChanged` lisait `gacha_session` / `hub_session` depuis `localStorage`, cherchait l'ID Discord dans un tableau `VIP_IDS` hardcodé, et accordait `window._isAdmin = true` même sans Firebase Auth.

**Après** : `window._isAdmin = !!user` — seul un utilisateur Firebase Auth authentifié est admin. Toutes les conditions `user || isVipSession` ont été réduites à `user`. Le champ `isVipSession` a été supprimé de l'event `jaharta:auth`.

---

#### `docs/admin.html`

**Supprimé :**
- `const VIP_IDS = [...]` (tableau de 6 Discord IDs)
- `function getVipSession()` — lisait `localStorage` pour vérifier un ID VIP
- `function getVipId()` — retournait l'ID Discord depuis la session localStorage
- Bloc de bypass dans `onAuthStateChanged` : `if(!user && vip){ currentAdmin = {uid: vip.id, role: 'admin'}; ... return; }` — ce bloc accordait un accès admin complet sans aucune vérification Firebase
- `function adminLogin()` — connexion email/password Firebase (non fonctionnel car seul Google est activé dans Firebase Console)
- Import `signInWithEmailAndPassword` devenu inutile
- Import `updateDoc` devenu inutile
- Champ `_vip_id` dans les writes de `writeLog()`, `deleteFiche()`, `deletePNJ()`

**Résultat** : L'accès admin passe exclusivement par `signInWithPopup(auth, new GoogleAuthProvider())` suivi d'une vérification `getDoc(doc(db, 'admins', user.uid))`. Si l'UID n'est pas présent dans la collection `admins`, `auth.signOut()` est appelé immédiatement.

**HTML modifié** : Le formulaire email/password (séparateur + deux inputs + bouton) a été retiré de l'écran de login. Seul le bouton "Se connecter avec Google" reste.

---

#### `docs/gacha.html`

**Supprimé :**
- `const VIP_IDS = [...]` — même tableau de 6 IDs
- `function isVIP(uid)` — utilisée pour accorder des avantages gacha
- `const CHEAT_CODE = 'Kami le gros BAISEUR'` — code cheat en clair dans le source
- `function showVipCheatBar()` — affichait une barre de saisie de code cheat pour les VIP
- `function activateCheatCode()` — écrivait `localStorage.gacha_specialz_forced = 'true'` si le code était correct (trivial à contourner sans le code)
- `function showVipRotateBar()` — affichait un bouton de rotation forcée des bannières
- `function vipForceRotation()` — écrivait dans `gacha_admin_actions` pour forcer une rotation, sans vérification serveur

**HTML supprimé :**
- `<div id="vip-cheat-bar">` — barre de saisie du code secret VIP
- `<div id="vip-rotate-bar">` — bouton de rotation forcée

**Écriture Firestore sécurisée :**
- `saveGachaBannerImg()` : `isVIP(U.id)` → `window._isAdmin`, suppression de `vipId` et du champ `_vip_id` dans le write `gacha_config/banner_image`
- `saveBannerImg(bid)` : même correction sur `gacha_config/banner_images`
- `showAdminBannerEditor()` : `isVIP(U.id)` → `window._isAdmin`
- `renderBanners()` : `isAdminUser = window._isAdmin || isVIP(U.id)` → `isAdminUser = window._isAdmin`

**Champs supprimés du write `gacha_pulls.add()` dans `doPull()` :**
```js
// SUPPRIMÉS — le bot doit calculer ces flags lui-même
vip_boost: vipBoost,
specialz_leg_plus: specialzActive,
specialz_full_leg: specialzFullLeg,
```
Ces champs étaient écrits par le client, lus par le bot Discord, et utilisés pour accorder des garanties de rareté (Epic+, Legendary+). N'importe quel utilisateur pouvait injecter `{vip_boost: true, specialz_full_leg: true}` dans une pull request via l'API Firestore.

**Ce qui reste (non supprimé) :**
- Les variables `GACHA_SPECIALZ_ACTIVE`, `GACHA_SPECIALZ_FIRST_PULL_USED`, `GACHA_SPECIALZ_BOOSTED_IDS` sont chargées depuis `gacha_config` Firestore (écrit par le bot) — elles sont en lecture seule côté client, utilisées uniquement pour l'affichage UI
- `specialzActive` dans `doPull()` est conservé pour mettre à jour `GACHA_SPECIALZ_FIRST_PULL_USED` (état UI local uniquement)

---

#### `docs/fiches.html`

**Supprimé :**
- Dans `deleteFicheById()` : l'IIFE qui récupérait un Discord ID depuis `localStorage` et l'écrivait dans `fiches/{id}._vip_id` avant la suppression
- Dans `submitCard()` : le spread `...(function(){ return {_vip_id: ...} })()` qui ajoutait `_vip_id` au document lors de la création d'une fiche
- Dans `openEditFiche()` (handler de mise à jour) : `const _vipId = ...` et `if(_vipId) _updatePayload._vip_id = _vipId`

---

#### `docs/pnj.html`

**Supprimé dans `saveFilter()`** : l'IIFE qui ajoutait `_vip_id` au document `pnj_filters` lors de la création d'un filtre.

**Supprimé dans `deleteFilter()`** : `updateDoc(doc(db, 'pnj_filters', id), {_vip_id: _v})` avant la suppression.

**Supprimé dans `updatePNJ()`** : `const _v = ...` et `if(_v) _upd._vip_id = _v` dans le payload de mise à jour PNJ.

---

### Champ `_vip_id` — explication et avertissement

Le champ `_vip_id` était ajouté par le client à de nombreux documents Firestore (fiches, pnj, pnj_filters, logs, gacha_config) lors des opérations d'écriture. Son usage original n'est pas documenté mais il semble avoir servi de marqueur d'audit ou de mécanisme de traçabilité non sécurisé.

**Ce champ a été intégralement supprimé de toutes les écritures client.** Ne pas le réintroduire. Si une traçabilité est nécessaire, elle doit être faite via le champ `byUid` dans la collection `logs`, qui est lié à l'UID Firebase Auth vérifié côté serveur.

---

### État après correction

| Mécanisme | Avant | Après |
|-----------|-------|-------|
| `window._isAdmin` | Firebase Auth OU localStorage Discord ID dans VIP_IDS | Firebase Auth **uniquement** |
| Login admin | Google + email/password | Google **uniquement** |
| Accès admin sans compte Google | Possible avec un ID Discord VIP en localStorage | **Impossible** |
| Champs rareté gacha (`vip_boost`, etc.) | Écrits par le client, lus par le bot | **Supprimés** — le bot doit les calculer |
| `_vip_id` dans les documents | Ajouté sur 6+ types d'opérations | **Supprimé** de toutes les écritures |
| Code cheat SPECIALZ | Hardcodé en clair dans gacha.html | **Supprimé** — feature retirée |

---

### Ce qui reste à faire (hors scope de ce patch)

Les points suivants ont été identifiés lors de l'audit mais **n'ont pas été modifiés** dans ce patch (modifications plus invasives nécessaires) :

1. **Firestore Security Rules** — aucun fichier `firestore.rules` n'est versionné dans le repo. Les règles actuelles dans la Firebase Console doivent être auditées et committées.
2. **`confirmAlloc()` dans hub.html** — écrit des stats arbitraires dans `characters/{id}` depuis le client. Devrait passer par le bot.
3. **Transactions shop** — `buyFromPlayerShop()` et `ppShopBuy()` ne sont pas atomiques (race condition possible sur le solde).
4. **`gacha_link_codes`** — la suppression du code après usage est côté client, permettant une réutilisation en cas d'erreur réseau.
5. **`fiches.html` expose tous les inventaires** — `getDocs(collection(db, 'inventories'))` charge toutes les données de tous les joueurs pour tout visiteur.

---

## Propositions de mesures de sécurité — Feuille de route

> Cette section est destinée à l'équipe de développement et aux IA qui reprendront ce projet.
> Les mesures sont classées par **priorité** (P1 = critique, P2 = important, P3 = améliorations).
> Toutes les recommandations tiennent compte des contraintes du projet : GitHub Pages (client-only), Firebase, vanilla JS sans bundler, bot Discord comme seul "serveur".

---

### P1 — Critiques (à faire avant le prochain déploiement en production)

---

#### P1-A : Versionner et déployer les Firestore Security Rules

**Problème** : sans fichier `firestore.rules` dans le repo, les règles peuvent être accidentellement réinitialisées aux valeurs par défaut (tout ouvert) depuis la Firebase Console.

**Solution** : créer `firestore.rules` à la racine du repo et `firebase.json` pour le déploiement.

```bash
# Installation CLI Firebase (une seule fois)
npm install -g firebase-tools
firebase login
firebase init firestore   # génère firestore.rules + firebase.json
```

**Contenu recommandé pour `firestore.rules`** :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Admins : lecture si connecté (vérification UID dans admin.html)
    //            écriture JAMAIS depuis le client (Firebase Console uniquement)
    match /admins/{uid} {
      allow read:  if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }

    // ── Logs : écriture si connecté Firebase Auth, lecture si admin
    match /logs/{id} {
      allow write: if request.auth != null;
      allow read:  if request.auth != null;
    }

    // ── Fiches : création publique, lecture publique si validée
    //            mise à jour/suppression si Firebase Auth (admin)
    match /fiches/{ficheId} {
      allow create: if true
        && request.resource.data.keys().hasAll(['firstname','lastname','race','rank','desc','discord','status'])
        && request.resource.data.status == 'en_attente'   // Jamais "validee" depuis le client
        && !('_vip_id' in request.resource.data);          // Champ interdit
      allow read:   if resource.data.status == 'validee' || request.auth != null;
      allow update: if request.auth != null
        && !('_vip_id' in request.resource.data);
      allow delete: if request.auth != null;
    }

    // ── PNJ : lecture publique, écriture si Firebase Auth
    match /pnj/{id} {
      allow read:  if true;
      allow write: if request.auth != null
        && !('_vip_id' in request.resource.data);
    }

    // ── Filtres PNJ : idem
    match /pnj_filters/{id} {
      allow read:  if true;
      allow write: if request.auth != null
        && !('_vip_id' in request.resource.data);
    }

    // ── Gacha config : lecture publique, écriture si Firebase Auth (admin)
    match /gacha_config/{docId} {
      allow read:  if true;
      allow write: if request.auth != null
        && !('_vip_id' in request.resource.data);
    }

    // ── Gacha pulls : création par n'importe quel utilisateur MAIS
    //                 uniquement les champs whitelistés (interdit vip_boost etc.)
    match /gacha_pulls/{pullId} {
      allow create: if request.resource.data.keys().hasOnly([
        'user_id', 'banner_id', 'count', 'status', 'created_at'
      ])
      && request.resource.data.status == 'pending'
      && request.resource.data.count in [1, 5, 10];
      allow read:   if true;
      allow update, delete: if false;  // Bot uniquement via service account
    }

    // ── Gacha admin actions (rotation forcée) : Firebase Auth obligatoire
    match /gacha_admin_actions/{id} {
      allow write: if request.auth != null;
      allow read:  if request.auth != null;
    }

    // ── Users : lecture si l'ID Discord correspond à la session (pas de Firebase Auth ici)
    //           écriture JAMAIS depuis le client (bot uniquement)
    match /users/{discordId} {
      allow read:  if true;   // Restreindre si possible une fois Firebase Auth mappé
      allow write: if false;  // Bot Discord (service account) uniquement
    }

    // ── Inventaires : lecture si connecté Discord, écriture JAMAIS depuis le client
    match /inventories/{docId} {
      allow read:  if true;
      allow write: if false;  // Bot uniquement
    }

    // ── Characters : lecture publique, écriture JAMAIS depuis le client
    match /characters/{charId} {
      allow read:  if true;
      allow write: if false;  // Bot uniquement (allocation stats via commande Discord)
    }

    // ── Tout le reste : refusé par défaut
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Déploiement** :
```bash
firebase deploy --only firestore:rules
```

**Note IA** : après avoir créé ce fichier, toujours vérifier dans la Firebase Console (Firestore → Rules → Playground) que les scénarios d'exploit connus sont bien bloqués : soumission d'une fiche avec `status: 'validee'`, écriture dans `gacha_pulls` avec `vip_boost: true`, écriture dans `characters`.

---

#### P1-B : Firebase App Check — empêcher les clients non autorisés

**Problème** : la clé `apiKey` Firebase est publique dans le source HTML. N'importe qui peut initialiser le SDK Firebase depuis sa console et contourner toute l'UI pour appeler Firestore directement.

**Solution** : activer **Firebase App Check** avec le provider **reCAPTCHA v3** (gratuit, invisible pour les utilisateurs, compatible GitHub Pages).

**Étapes** :

1. Firebase Console → App Check → Enregistrer l'app → choisir **reCAPTCHA v3**
2. Obtenir la clé de site reCAPTCHA depuis [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
3. Ajouter dans chaque page (avant le module Firebase) :

```html
<!-- Dans le <head>, avant le script type="module" -->
<script src="https://www.gstatic.com/recaptcha/releases/xxx/recaptcha__fr.js" async defer></script>
```

4. Dans chaque module Firebase, initialiser App Check :

```js
import { initializeAppCheck, ReCaptchaV3Provider } from
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('VOTRE_CLE_RECAPTCHA_PUBLIQUE'),
  isTokenAutoRefreshEnabled: true
});
```

5. Firebase Console → App Check → Activer l'enforcement pour **Firestore** et **Storage**

**Effet** : toute requête Firestore sans token App Check valide sera rejetée au niveau de l'infrastructure Firebase, avant même d'atteindre les Security Rules.

**Note IA** : App Check n'est pas une silver bullet — un attaquant déterminé peut extraire le token depuis le navigateur. Mais il élimine les attaques automatisées et les scripts de bot simples.

---

#### P1-C : Interdire le champ `_vip_id` au niveau des Firestore Rules

Même si le code client ne l'écrit plus, une règle explicite empêche toute réintroduction accidentelle (voir règles P1-A ci-dessus — clause `!('_vip_id' in request.resource.data)`).

---

### P2 — Importants (à planifier dans le prochain sprint)

---

#### P2-A : Migrer `confirmAlloc()` vers une commande bot Discord

**Problème** : `confirmAlloc()` dans `hub.html` écrit directement dans `characters/{charId}` depuis le client. Avec les règles P1-A (`allow write: if false`), cette fonction sera cassée — c'est intentionnel.

**Solution** : remplacer l'allocation de stats par une commande Discord `/alloc force:{5} agilite:{3}` traitée par le bot. Le bot vérifie les points disponibles côté serveur avant d'écrire en Firestore.

**Côté client (hub.html)** : transformer `confirmAlloc()` en une requête vers `stat_allocation_requests` :

```js
async function confirmAlloc() {
  if (!Object.keys(ALLOC_PENDING).length) return;
  // Écrit une demande — le bot la traite et écrit dans characters/
  await db.collection('stat_allocation_requests').add({
    user_id: UID,
    char_id: CHAR_ID,
    allocations: ALLOC_PENDING,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  showToast('Demande envoyée — en attente de validation bot', 'success');
  ALLOC_PENDING = {};
  renderAllocUI();
}
```

**Règle Firestore pour `stat_allocation_requests`** :
```javascript
match /stat_allocation_requests/{id} {
  allow create: if request.resource.data.keys().hasOnly([
    'user_id', 'char_id', 'allocations', 'status', 'created_at'
  ]) && request.resource.data.status == 'pending';
  allow read:   if true;
  allow update, delete: if false; // Bot uniquement
}
```

---

#### P2-B : Transactions Firestore pour les achats shop

**Problème** : `buyFromPlayerShop()` et `ppShopBuy()` font plusieurs lectures/écritures séquentielles. Une double-dépense est possible si deux requêtes sont envoyées en même temps.

**Solution** : utiliser `runTransaction()` pour rendre les achats atomiques.

```js
async function buyFromPlayerShop(itemId, sellerId, price) {
  await db.runTransaction(async (t) => {
    const buyerRef  = db.collection('users').doc(UID);
    const sellerRef = db.collection('users').doc(sellerId);
    const itemRef   = db.collection('shop_items').doc(itemId);

    const [buyerSnap, sellerSnap, itemSnap] = await Promise.all([
      t.get(buyerRef), t.get(sellerRef), t.get(itemRef)
    ]);

    if (!itemSnap.exists) throw new Error('Item introuvable');
    const balance = buyerSnap.data().navarites || 0;
    if (balance < price) throw new Error('Navarites insuffisants');

    t.update(buyerRef,  { navarites: balance - price });
    t.update(sellerRef, { navarites: (sellerSnap.data().navarites || 0) + price });
    t.delete(itemRef);
  });
}
```

---

#### P2-C : Validation côté Firestore Rules pour `gacha_link_codes`

**Problème** : les link codes sont supprimés côté client après usage. Si la suppression échoue (réseau), le code reste valide.

**Solution** : ajouter un champ `used: true` comme transition autorisée, ou mieux déléguer l'invalidation au bot.

```javascript
// Règle : un client peut seulement marquer used=true (pas créer ni supprimer)
match /users/{uid}/linkCodes/{code} {
  allow read:   if true;
  allow update: if request.resource.data.used == true
    && !request.resource.data.diff(resource.data).affectedKeys()
         .hasAny(['expiresAt', 'discord_id']); // Interdit de modifier l'identité
  allow create, delete: if false; // Bot uniquement
}
```

---

#### P2-D : Content Security Policy (CSP)

**Problème** : GitHub Pages ne permet pas de définir des headers HTTP personnalisés. Une faille XSS permettrait d'exécuter du JS arbitraire et de modifier `window._isAdmin`.

**Solution partielle** : utiliser une balise `<meta>` CSP dans le `<head>` de chaque page.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline'
    https://www.gstatic.com
    https://cdn.jsdelivr.net
    https://cdnjs.cloudflare.com
    https://unpkg.com
    https://www.google.com
    https://www.gstatic.com/recaptcha/;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self'
    https://*.firebaseio.com
    https://*.googleapis.com
    https://firestore.googleapis.com
    https://firebasestorage.googleapis.com;
  frame-src 'none';
  object-src 'none';
">
```

**Limites** : `'unsafe-inline'` est nécessaire car les scripts Firebase sont inlinés. Pour supprimer `'unsafe-inline'`, il faudrait migrer vers des fichiers `.js` externes + nonces — incompatible avec l'architecture actuelle sans bundler.

**Alternative** : héberger sur **Cloudflare Pages** (gratuit) au lieu de GitHub Pages — Cloudflare permet de définir de vrais headers HTTP via `_headers` file, incluant une CSP stricte et `X-Frame-Options: DENY`.

---

#### P2-E : Restreindre l'exposition des inventaires dans `fiches.html`

**Problème** : `fiches.html` charge en une seule requête `getDocs(collection(db, 'inventories'))` — tous les inventaires de tous les joueurs sont envoyés au navigateur de chaque visiteur.

**Solution** : calculer les bonus d'équipement côté bot au moment de la validation d'une fiche, et les stocker directement dans le document `fiches/{id}` :

```js
// Dans le bot, lors de la validation d'une fiche :
const bonuses = computeEquipmentBonuses(playerId);
await db.collection('fiches').doc(ficheId).update({
  equipment_bonuses: bonuses,  // précalculé, pas besoin de lire inventories côté client
  validated_at: new Date()
});
```

Côté client, `fiches.html` lit simplement `fiche.equipment_bonuses` sans charger les inventaires.

---

### P3 — Améliorations recommandées (qualité et observabilité)

---

#### P3-A : Audit automatique des Security Rules avec GitHub Actions

Créer `.github/workflows/firestore-rules-audit.yml` :

```yaml
name: Firestore Rules Audit
on:
  pull_request:
    paths: ['firestore.rules']

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g firebase-tools
      - run: firebase emulators:exec --only firestore
               "npx @firebase/rules-unit-testing"
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

#### P3-B : Scanner automatique de secrets avec `truffleHog` ou `gitleaks`

Même si la clé Firebase est publiquement documentée, d'autres secrets pourraient être accidentellement committés (tokens bot Discord, clés API tierces).

```yaml
# .github/workflows/secret-scan.yml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

#### P3-C : Alertes Firebase sur les writes anormaux

Dans la **Firebase Console → Alertes** ou via **Google Cloud Monitoring** :

- Alerte si `gacha_pulls` reçoit plus de 50 documents en 10 minutes depuis le même `user_id`
- Alerte si `admins` est modifié (toute écriture → notification email)
- Alerte si `characters` est modifié depuis une IP inconnue

---

#### P3-D : Rotation périodique des link codes Discord

Le bot Discord devrait :
1. Générer des codes avec une **entropie suffisante** (24+ caractères aléatoires, pas 12)
2. Les invalider après **5 minutes** (pas 10) et après **une seule utilisation vérifiée côté bot**
3. Limiter à **3 codes actifs par joueur** en même temps (prévention brute-force)

---

#### P3-E : `window._isAdmin` — protection de la variable globale

**Problème mineur** : `window._isAdmin` est une variable globale écrasable par n'importe quel script ou extension navigateur.

**Solution** : la transformer en propriété non-configurable via `Object.defineProperty` dans `auth-badge.js` :

```js
// Dans onAuthStateChanged, remplacer l'assignation directe :
// window._isAdmin = !!user;

// Par une propriété non-writable (se réinitialise à chaque changement d'état auth) :
Object.defineProperty(window, '_isAdmin', {
  get: () => !!user,
  configurable: true  // configurable=true pour permettre la redéfinition au prochain appel
});
```

**Limite** : cela ne protège pas contre un attaquant qui appelle directement `Object.defineProperty` lui-même. La vraie protection reste dans les Firestore Rules (P1-A).

---

### Tableau récapitulatif des mesures

| ID | Mesure | Effort | Impact sécurité | Prérequis |
|----|--------|--------|-----------------|-----------|
| P1-A | Firestore Security Rules versionnées + déployées | Moyen | **Critique** | firebase-tools CLI |
| P1-B | Firebase App Check (reCAPTCHA v3) | Faible | Élevé | Compte Google reCAPTCHA |
| P1-C | Règle `_vip_id` interdit | Inclus dans P1-A | Moyen | — |
| P2-A | `confirmAlloc()` → commande bot | Élevé | **Critique** | Modification bot Discord |
| P2-B | Transactions atomiques shop | Moyen | Élevé | — |
| P2-C | `gacha_link_codes` invalidation bot | Moyen | Moyen | Modification bot Discord |
| P2-D | Content Security Policy (`<meta>`) | Faible | Moyen | — |
| P2-E | Inventaires précalculés côté bot | Élevé | Moyen | Modification bot Discord |
| P3-A | GitHub Actions audit Rules | Faible | Observabilité | CI/CD |
| P3-B | Secret scanning (gitleaks) | Faible | Prévention fuites | CI/CD |
| P3-C | Alertes Firebase writes anormaux | Moyen | Détection | Google Cloud |
| P3-D | Rotation codes Discord durcie | Moyen | Moyen | Modification bot Discord |
| P3-E | `_isAdmin` non-writable | Faible | Faible (défense profondeur) | — |
