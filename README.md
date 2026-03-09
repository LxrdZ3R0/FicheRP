# JAHARTA // RP — Documentation

Site web officiel du serveur RP Discord **Jaharta**.  
Stack : HTML/CSS/JS vanille · Firebase (Firestore + Storage + Auth) · GitHub Pages ou Firebase Hosting.

---

## Structure du projet

```
jaharta-rp/
├── public/                        ← Fichiers servis publiquement
│   ├── index.html                 ← Accueil
│   ├── fiches.html                ← Base de données personnages joueurs
│   ├── pnj.html                   ← PNJ importants (admin only pour création)
│   ├── portail.html               ← Portail des ressources
│   ├── admin.html                 ← Panel d'administration
│   └── assets/
│       └── img/                   ← Images locales (favicon, og:image...)
│
├── .github/
│   └── workflows/
│       └── deploy.yml             ← Déploiement automatique vers Firebase Hosting
│
├── .firebaserc                    ← Lie le dossier au projet Firebase "jaharta-rp"
├── firebase.json                  ← Config Firebase Hosting (public dir, headers, rewrites)
├── .gitignore
└── README.md
```

---

## Hébergement actuel : GitHub Pages

Les fichiers dans `public/` sont servis via GitHub Pages.

---

## Hébergement futur : Firebase Hosting + nom de domaine

Quand vous serez prêt à migrer sur Firebase Hosting :

### 1. Installer Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Déployer manuellement
```bash
cd jaharta-rp
firebase deploy --only hosting
```
Le site sera en ligne sur : `https://jaharta-rp.web.app`

### 3. Connecter votre nom de domaine
1. Firebase Console → Hosting → **Add custom domain**
2. Entrez votre domaine (ex: `jaharta-rp.com`)
3. Ajoutez les enregistrements DNS indiqués chez votre registrar
4. Firebase provisionne le SSL automatiquement (~24h)

### 4. Déploiement automatique via GitHub Actions
Le fichier `.github/workflows/deploy.yml` déclenche un déploiement à chaque `git push` sur `main`.

**À configurer une seule fois :**
1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**
2. GitHub repo → Settings → Secrets → Actions → **New repository secret**
   - Name : `FIREBASE_SERVICE_ACCOUNT`
   - Value : coller le contenu du fichier JSON téléchargé

---

## Firebase — Collections Firestore

| Collection     | Usage |
|----------------|-------|
| `fiches`       | Fiches personnages joueurs (statut : en_attente / validee / rejetee) |
| `pnj`          | Personnages non-joueurs créés par les admins |
| `pnj_filters`  | Filtres personnalisés de la page PNJ (label + couleur) |


## Portail — Liens à configurer

Dans `public/portail.html`, rechercher les commentaires `<!-- LIEN : ... -->` et remplacer les `href="#"` :

| Commentaire | Description |
|-------------|-------------|
| `LIEN : Lore` | URL de votre site Lore |
| `LIEN : Cartes` | URL de vos cartes du monde |
| `LIEN : Règles` | URL du règlement RP |
| `LIEN : Templates` | URL des templates de fiche |
| `LIEN : Guide` | URL du guide de création |
| `LIEN : Glossaire` | URL du wiki/glossaire |

---

## Discord

Serveur : [discord.gg/jBMnmeR944](https://discord.gg/jBMnmeR944)
