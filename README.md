# JAHARTA // RP — Documentation Développeur

Site web officiel du serveur RP Discord **Jaharta**.

> **Pour les nouveaux collaborateurs** : lisez ce fichier en entier avant de toucher au code.

---

## Stack technique

| Élément | Technologie |
|---------|-------------|
| Hébergement | GitHub Pages (`/docs`) |
| Base de données | Firebase Firestore (NoSQL, temps réel) |
| Stockage images | Firebase Storage |
| Authentification admin | Firebase Auth (email/password) |
| Frontend | HTML / CSS / JS vanilla — aucun framework |

---

## Structure du repo

```
JahartaRP/
│
├── docs/                          ← Dossier servi par GitHub Pages
│   ├── index.html                 ← Page d'accueil
│   ├── fiches.html                ← Base de données personnages joueurs (PC)
│   ├── pnj.html                   ← Personnages non-joueurs (admin seulement)
│   ├── portail.html               ← Portail des ressources (lore, cartes…)
│   ├── racesjouables.html         ← Encyclopédie des 42 races jouables
│   ├── admin.html                 ← Panel d'administration (login requis)
│   │
│   ├── css/
│   │   └── jaharta.css            ← STYLES PARTAGÉS — inclus par toutes les pages
│   │
│   ├── js/
│   │   └── debug.js               ← Logger d'erreurs flottant (dev only)
│   │
│   └── img/
│       ├── banner.png             ← Image Open Graph (Discord embed)
│       ├── favicon.ico
│       ├── favicon-32.png
│       └── favicon-180.png        ← Apple touch icon
│
├── .gitignore
└── README.md
```

---

## Configuration Firebase

**Toutes les pages partagent la même config Firebase** — déclarée inline dans chaque `<script type="module">`.

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

> **Note** : cette clé est publique (les Firebase Security Rules protègent les données côté serveur).

---

## Collections Firestore

### `fiches` — Fiches personnages joueurs
```
{
  firstname:     string       // Prénom
  lastname:      string       // Nom
  race:          string       // Groupe de race (humanoid, zooid…)
  raceSpecific:  string       // Race précise (Human, Elf, Neko…)
  rank:          string       // Rang de puissance (F → Z)
  desc:          string       // Description courte
  discord:       string       // Pseudo Discord
  photoUrl:      string       // URL de la photo (Firebase Storage)
  ficheFileUrl:  string       // URL du fichier fiche uploadé (optionnel)
  ficheFileName: string       // Nom du fichier
  linkUrl:       string       // Lien externe vers la fiche
  links:         Array        // [{t: "Fiche", h: "https://…"}]
  stats:         Object       // {str, agi, spd, int, mana, res, cha, aura} (0–9999)
  powers:        Array        // [{name: string, desc: string}]
  status:        string       // "en_attente" | "validee" | "rejetee"
  createdAt:     Timestamp
  updatedAt:     Timestamp    // Défini lors des modifications admin
  validatedAt:   Timestamp    // Défini lors de la validation
  rejectReason:  string       // Motif du rejet (optionnel)
}
```

### `pnj` — Personnages non-joueurs
```
{
  nom:         string
  prenom:      string
  age:         string
  race:        string
  role:        string
  titre:       string       // Titre spécial affiché sous le nom
  marital:     string
  taille:      string
  category:    string       // ID du filtre (ref: collection pnj_filters)
  danger:      string       // "RANG : S", "DANGER : X"…
  photoUrl:    string
  desc:        string
  motivations: Object       // {desc, social, economique, militaire}
  createdAt:   Timestamp
}
```

### `pnj_filters` — Filtres personnalisés pour la page PNJ
```
{
  label:     string       // Nom affiché ("Guerrier", "Noble"…)
  color:     string       // Couleur hex (#ff3030)
  order:     number
  createdAt: Timestamp
}
```

---

## Groupes de races et couleurs

| Groupe         | Clé Firestore | Couleur    |
|----------------|---------------|------------|
| Humanoid       | `humanoid`    | `#00c8ff`  |
| Zooid          | `zooid`       | `#44ff88`  |
| Mythical Zooid | `mythzooid`   | `#b06eff`  |
| Demon          | `demon`       | `#ff3030`  |
| Artificial     | `artificial`  | `#ffd60a`  |
| Semi-Liquid    | `semiliquid`  | `#00e5cc`  |
| Undead         | `undead`      | `#9a8cff`  |

## Rangs de puissance

`F → E → D → C → B → A → S → SS → SSS → X → Z`

Définis dans la constante `RANKS` dans `fiches.html` et `admin.html`.

---

## Thème visuel — jaharta.css

Variables CSS globales (`:root`) :

| Variable       | Valeur par défaut | Usage                         |
|----------------|-------------------|-------------------------------|
| `--cyan`       | `#00f5ff`         | Couleur principale            |
| `--magenta`    | `#ff006e`         | Accent secondaire             |
| `--gold`       | `#ffd60a`         | Accent tertiaire              |
| `--dark`       | `#04060f`         | Fond principal                |
| `--dark2`      | `#080d1a`         | Fond secondaire (cartes)      |
| `--text`       | `#c8e0f0`         | Texte normal                  |
| `--muted`      | `#5a7a90`         | Texte atténué                 |
| `--accent`     | `var(--cyan)`     | **Surchargé par chaque page** |

**Accent par page** :

| Page               | `--accent` |
|--------------------|-----------|
| index.html         | cyan      |
| fiches.html        | cyan      |
| pnj.html           | magenta   |
| portail.html       | gold      |
| racesjouables.html | gold      |
| admin.html         | gold      |

---

## Accès Admin

1. Créer un compte dans **Firebase Console → Authentication → Users**
2. Aller sur `/admin.html` et se connecter avec email/mot de passe
3. Une fois connecté :
   - Badge vert `ADMIN` apparaît dans le nav de toutes les pages
   - Boutons ✎ Modifier / ✕ Supprimer apparaissent sur les cartes (fiches et PNJ)
   - Page PNJ : bouton `Créer un PNJ` visible
   - Filtres PNJ : bouton `+ Filtre` + croix de suppression visibles

---

## Règles de sécurité Firebase

### Firestore
```javascript
match /fiches/{ficheId} {
  allow create: if true;                           // Tous peuvent soumettre
  allow read:   if resource.data.status == "validee" || request.auth != null;
  allow update, delete: if request.auth != null;  // Admins seulement
}
match /pnj/{id}         { allow read: if true; allow write: if request.auth != null; }
match /pnj_filters/{id} { allow read: if true; allow write: if request.auth != null; }
```

### Storage
```
/photos/**  → lecture publique, écriture publique (images < 5MB)
/pnj/**     → lecture publique, écriture admin seulement
/fiches/**  → lecture publique, écriture publique (images < 5MB)
```

---

## Déploiement

Le site est déployé automatiquement sur GitHub Pages depuis `/docs/` à chaque push sur `main`.

**URL** : https://lxrdz3r0.github.io/JahartaRP/

### Tester en local

Firebase ESM nécessite un serveur HTTP (pas d'ouverture directe du fichier) :

```bash
cd docs
python3 -m http.server 8080
# Ouvrir → http://localhost:8080
```

---

## Conventions de code

- **CSS** : commentaires `/* ══ Section ══ */` pour chaque bloc logique
- **JS inline** : commentaires `/* ─── Section ─── */` en début de bloc fonctionnel
- **Pas de framework** : vanilla JS + Firebase SDK ESM (CDN gstatic)
- **Globals window._*** : les variables Firebase sont exposées sur `window` pour être accessibles depuis les `<script>` non-module
  - `window._db` → instance Firestore
  - `window._storage` → instance Storage
  - `window._isAdmin` → booléen auth
  - `window._doc`, `window._updateDoc`, etc. → fonctions Firestore
- **Temps réel** : `onSnapshot()` sur les collections fiches/pnj → pas de rechargement nécessaire
- **Formulaires** : pas de `<form>` — tout est géré via `onclick` et JS pour éviter les rechargements

---

## Contacts

Serveur Discord : [discord.gg/jBMnmeR944](https://discord.gg/jBMnmeR944)
