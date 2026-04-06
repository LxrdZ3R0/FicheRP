# UPDATES — Journal des modifications importantes

> Ce fichier documente les changements structurels significatifs du projet.
> Il est destiné à être lu par un développeur humain **ou une IA** reprenant le projet.
> Les modifications mineures (UI, textes) ne sont pas consignées ici.

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
