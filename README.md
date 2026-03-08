# JAHARTA // RP — Guide de configuration Firebase

## Fichiers du projet
```
jaharta-rp/
├── index.html   ← Site principal (visible par tous)
├── admin.html   ← Panel admin (réservé aux admins)
└── README.md    ← Ce fichier
```

---

## Étape 1 — Créer le projet Firebase

1. Allez sur **https://console.firebase.google.com**
2. Cliquez **"Créer un projet"**
3. Nommez-le `jaharta-rp` → Continuer
4. Désactivez Google Analytics (pas nécessaire) → Créer

---

## Étape 2 — Activer Firestore (base de données)

1. Dans le menu gauche → **Firestore Database**
2. Cliquez **"Créer une base de données"**
3. Choisissez **"Mode production"** → Suivant
4. Choisissez la région `eur3 (europe-west)` → Activer

### Règles de sécurité Firestore
Dans **Firestore → Règles**, remplacez tout par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fiches/{ficheId} {
      // Tout le monde peut soumettre une fiche
      allow create: if true;
      // Tout le monde peut lire les fiches validées
      allow read: if resource.data.status == "validee"
                  || request.auth != null;
      // Seuls les admins connectés peuvent modifier/supprimer
      allow update, delete: if request.auth != null;
    }
  }
}
```

---

## Étape 3 — Activer Firebase Storage (photos)

1. Dans le menu gauche → **Storage**
2. Cliquez **"Commencer"** → Mode production → Continuer

### Règles Storage
Dans **Storage → Règles** :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## Étape 4 — Activer l'Authentification (pour les admins)

1. Dans le menu gauche → **Authentication**
2. Cliquez **"Commencer"**
3. Onglet **"Sign-in method"** → Activez **Email/Mot de passe**
4. Onglet **"Users"** → **"Add user"**
5. Entrez l'email et mot de passe de votre compte admin

> Répétez pour chaque administrateur Jaharta.

---

## Étape 5 — Récupérer les clés Firebase

1. Dans Firebase, cliquez l'icône **⚙ engrenage** → **Paramètres du projet**
2. Descendez jusqu'à **"Vos applications"**
3. Cliquez **"</>  Web"** → Nommez l'app `jaharta-web` → Enregistrer
4. Copiez le bloc `firebaseConfig` qui ressemble à :

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "jaharta-rp.firebaseapp.com",
  projectId:         "jaharta-rp",
  storageBucket:     "jaharta-rp.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

## Étape 6 — Coller les clés dans les fichiers

Ouvrez **index.html** et **admin.html** avec un éditeur de texte (Notepad, VS Code...).

Cherchez ce bloc (présent dans les deux fichiers) :

```javascript
const firebaseConfig = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT.firebaseapp.com",
  projectId:         "VOTRE_PROJECT_ID",
  storageBucket:     "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};
```

Remplacez **chaque valeur** par celles copiées à l'étape 5.
**Faites-le dans les deux fichiers.**

---

## Étape 7 — Déployer sur GitHub Pages

1. Allez sur **https://github.com** → Nouveau dépôt `jaharta-rp`
2. Uploadez les 3 fichiers : `index.html`, `admin.html`, `README.md`
3. **Settings → Pages → Source : main / root → Save**
4. Votre site est en ligne sur `https://VOTRE-USERNAME.github.io/jaharta-rp/`

---

## Comment ça fonctionne

```
Joueur                          Firebase                    Admin
  │                                │                          │
  ├─ Remplit le formulaire         │                          │
  ├─ Clique "Soumettre" ──────────►│ Stocke en "en_attente"   │
  │                                │◄─────────────────────────┤ Va sur admin.html
  │                                │                          ├─ Voit la fiche
  │                                │                          ├─ Choisit un statut
  │                                │◄─────────────────────────┤ Clique "Valider"
  │                                │ Status → "validee"        │
  ◄── La fiche apparaît sur ───────┤                          │
      index.html automatiquement   │                          │
```

---

## URL utiles après déploiement

| Page | URL |
|------|-----|
| Site public | `https://USERNAME.github.io/jaharta-rp/` |
| Panel admin | `https://USERNAME.github.io/jaharta-rp/admin.html` |

> Le panel admin est protégé par email/mot de passe Firebase.
> Seuls les comptes créés dans Firebase Authentication peuvent y accéder.
