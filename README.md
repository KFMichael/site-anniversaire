# Nido

Application pour organiser la vie courante à deux (ou en coloc, entre
amis) : répartition de la charge mentale, courses, menus de la semaine,
séances de sport, mots de passe partagés et récap hebdomadaire.

Chaque couple ou groupe a son **espace** : on s'y connecte par lien magique
ou Google, et on invite les autres membres avec un lien.

Backlog et plan : [`docs/BACKLOG.md`](docs/BACKLOG.md). Le site anniversaire
d'origine est archivé sur la branche `archive/site-anniversaire` ; ses
écrans vivent dans la partie **Activités**.

## Stack

- React + Vite, React Router
- Tailwind CSS v4 (identité iOS : `design/DESIGN.md`)
- Supabase : Auth, Postgres + RLS, Storage
- Leaflet (carte des voyages)

## Démarrer en local

```bash
npm install
cp .env.local.example .env.local   # renseigner les clés Supabase
npm run dev
```

Configuration de Supabase (migrations, lien magique, Google) :
[`docs/SUPABASE.md`](docs/SUPABASE.md).

## Structure

```
src/
├── App.jsx                  # Routes et garde-fous (connecté ? espace ?)
├── config.js                # Nom de l'app, liste des modules du tableau de bord
├── lib/supabase.js          # Client Supabase
├── components/
│   ├── Structure.jsx        # Barre d'onglets en bas
│   ├── ui.jsx               # Page, Carte, Bouton, ChampTexte
│   └── Chargement.jsx
└── features/
    ├── auth/                # Connexion (lien magique, Google), session
    ├── espace/              # Espace courant, création, invitation, réglages
    ├── tableau-de-bord/     # Accueil : modules de l'espace
    └── activites/           # Ex-site anniversaire
        ├── Activites.jsx    # Sous-navigation
        ├── Quiz.jsx         # Idées d'activités (5 questions)
        ├── CarnetActivites.jsx
        ├── CarteVoyages.jsx
        ├── MurMessages.jsx
        ├── ModeSurprise.jsx # Ex-écran d'accueil animé (mot de passe → quiz)
        ├── ReglagesSurprise.jsx
        └── data/
supabase/migrations/         # Schéma SQL, à exécuter dans l'ordre
```

## Routes

| Route | Page |
|---|---|
| `/connexion` | Lien magique / Google |
| `/bienvenue` | Créer ou rejoindre un espace |
| `/rejoindre/:code` | Accepter une invitation |
| `/` | Tableau de bord |
| `/espace` | Membres, invitation, profil, changement d'espace |
| `/activites/idees` · `carnet` · `voyages` · `messages` | Partie Activités |
| `/activites/surprise` | Mots de passe du mode surprise |
| `/surprise` | Mode surprise (plein écran, enchaîne sur le quiz) |

## Déployer

Vercel : renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les
variables d'environnement du projet, puis ajouter l'URL de production dans
les *Redirect URLs* de Supabase.
