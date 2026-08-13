# Site anniversaire surprise 🎉

Site web surprise avec 4 sections : quiz d'activité, carte des voyages,
mur de messages, carnet d'activités.

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

## À faire avant la mise en ligne

1. **Connecter Supabase**
   - Copier `.env.local.example` vers `.env.local`
   - Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
     (Project Settings > API sur le dashboard Supabase)

2. **Créer les tables Supabase**
   - `activites_carnet` : id, nom_activite (text), note (int), commentaire
     (text), photo_url (text), date (timestamp)
   - `messages_proches` : id, auteur (text), message (text), photo_url
     (text, optionnel), date (timestamp)
   - Créer un bucket de stockage `photos-carnet` (accès public en lecture)

3. **Remplir le contenu**
   - `src/data/voyages.js` : liste des lieux visités (coordonnées GPS,
     photo, anecdote)
   - Collecter les messages des proches pour le mur

4. **Déployer**
   - Vercel ou Netlify, connecté au nom de domaine

## Structure

```
src/
├── components/     # Accueil, Quiz, CarteVoyages, MurMessages, CarnetActivites
├── data/           # activites.js (grille du quiz), voyages.js
├── lib/            # supabase.js (client)
└── App.jsx         # navigation entre sections
```
