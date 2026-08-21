# Site anniversaire surprise

Site web surprise avec écran d'accueil animé + 4 sections : quiz d'activité, carnet, carte des voyages, mur de messages.

## Stack

- React + Vite
- Tailwind CSS v4
- Supabase (base de données + stockage photos)
- Leaflet (carte interactive)

## Démarrer en local

```bash
npm install
npm run dev
```

## État du code

### Composants

| Composant | État | Visible |
|---|---|---|
| `Accueil.jsx` | Complet | Toujours (écran d'entrée) |
| `Quiz.jsx` | Complet | Oui |
| `CarnetActivites.jsx` | Complet | Oui |
| `CarteVoyages.jsx` | Structure OK, données vides | Non (`actif: false`) |
| `MurMessages.jsx` | Structure OK, données vides | Non (`actif: false`) |

### Parcours Accueil (3 écrans animés)

1. **Bienvenue** — "Bienvenue / U" apparaît en fondu, bouton Entrer
2. **Aimes-tu** — "Est-ce que tu m'aimes ?" — bouton Non esquive la souris
3. **Transition** — "Je le savais. / Maintenant, aide-moi à te gâter." puis bascule auto vers l'app

### Quiz

- 2 questions (axe actif/calme + axe créatif/passif)
- Grille 2x2 dans `src/data/activites.js` — tirage aléatoire dans la case correspondante
- Option "Tirer une autre idée" et "Recommencer"

### Carnet d'activités

- Lit depuis Supabase `activites_carnet`
- Formulaire d'ajout : nom, note /10, commentaire, photo (upload vers bucket `photos-carnet`)
- Affiche "table à créer" si Supabase non configuré

### Carte des voyages

- Leaflet, centré sur Paris par défaut
- Données dans `src/data/voyages.js` — **actuellement vide**
- Masquée jusqu'à avoir des données

### Mur de messages

- Lit depuis Supabase `messages_proches`
- Lecture seule (les proches envoient les messages directement en BDD)
- Masqué jusqu'à avoir des messages

## Identité visuelle

Style iOS, thème clair/sombre automatique (suit `prefers-color-scheme`,
pas de bouton de bascule). Détail complet : `design/DESIGN.md`. Tokens
Tailwind custom (définis dans `src/index.css`, valeurs différentes par
thème sauf l'accent) :
- `bg-bg-base` / `bg-bg-elevated` / `bg-bg-elevated-glass` — fonds
- `text-text-primary`, `text-text-secondary`, `text-text-muted`
- `border-separator` — bordures fines
- `bg-accent` / `text-accent` — bleu iOS unique (`#0071EB`)
- `shadow-soft`, `shadow-elevated` — ombres douces
- `ease-spring` — courbe de transition avec léger rebond

## Avant la mise en ligne

### 1. Connecter Supabase

```bash
cp .env.local.example .env.local
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
# (Supabase > Project Settings > API)
```

### 2. Créer les tables Supabase

**`activites_carnet`**
```sql
create table activites_carnet (
  id uuid primary key default gen_random_uuid(),
  nom_activite text not null,
  note int,
  commentaire text,
  photo_url text,
  date timestamp default now()
);
```

**`messages_proches`**
```sql
create table messages_proches (
  id uuid primary key default gen_random_uuid(),
  auteur text not null,
  message text not null,
  photo_url text,
  date timestamp default now()
);
```

Créer un bucket de stockage `photos-carnet` (accès public en lecture).

### 3. Remplir les données

- `src/data/voyages.js` : ajouter les lieux visités (voir exemple dans le fichier)
- Insérer les messages des proches directement dans Supabase
- Activer `CarteVoyages` et `MurMessages` dans `App.jsx` (`actif: true`)

### 4. Déployer

Vercel ou Netlify — connecter les variables d'environnement Supabase dans les settings du projet.

## Structure

```
src/
├── components/
│   ├── Accueil.jsx        # Écran d'entrée animé (3 étapes)
│   ├── Quiz.jsx           # Quiz 2 questions -> suggestion d'activité
│   ├── CarnetActivites.jsx # Carnet avec upload photo (Supabase)
│   ├── CarteVoyages.jsx   # Carte Leaflet (masquée, données vides)
│   └── MurMessages.jsx    # Mur de messages (masqué, données vides)
├── data/
│   ├── activites.js       # Grille quiz + questions
│   └── voyages.js         # Liste des voyages (vide, à remplir)
├── lib/
│   └── supabase.js        # Client Supabase
└── App.jsx                # Navigation entre sections
```
