# Nido

Application pour organiser la vie courante à deux (ou en coloc, entre
amis) : répartition de la charge mentale, courses, menus de la semaine,
séances de sport, mots de passe partagés et récap hebdomadaire.

Chaque couple ou groupe a son **espace** : on s'y connecte par lien magique
ou Google, et on invite les autres membres avec un lien.

Backlog et plan : [`docs/BACKLOG.md`](docs/BACKLOG.md). Le site anniversaire
d'origine est archivé sur la branche `archive/site-anniversaire` ; ses
écrans vivent dans la partie **Activités**.

## Coffre à mots de passe

Les mots de passe sont chiffrés **dans le navigateur** par une clé
maîtresse aléatoire (AES-GCM 256). Cette clé n'est jamais stockée en clair,
seulement enveloppée :

- par la **phrase secrète** de l'espace (PBKDF2-SHA256, 600 000 itérations) ;
- par **Face ID / Touch ID** sur chaque appareil activé : une passkey
  WebAuthn et son extension PRF fournissent un secret calculé dans la puce
  sécurisée de l'appareil (iOS 18+, macOS Safari 18+, Chrome récent).

Supabase ne stocke que du chiffré : ni la phrase, ni la clé, ni même le nom
des entrées. Une phrase oubliée est irrécupérable (le coffre peut seulement
être réinitialisé par un admin).

**Import CSV** (`src/features/coffre/import-csv.js`) : l'export d'un
gestionnaire (Apple Mots de passe, Chrome, Firefox, Bitwarden, 1Password,
LastPass, KeePass, Dashlane) ou le modèle proposé sur ordinateur est lu dans
le navigateur, puis chaque entrée est chiffrée avant l'envoi : le fichier ne
quitte jamais l'appareil.

> Les passkeys sont liées au nom de domaine : celles créées sur une URL de
> prévisualisation Vercel ne fonctionnent pas en production. Activer Face ID
> sur le domaine définitif.

## Stack

- React + Vite, React Router
- Tailwind CSS v4 (identité iOS, thème clair / sombre / système : `design/DESIGN.md`)
- Supabase : Auth, Postgres + RLS, Storage
- Leaflet (carte des voyages)

## Démarrer en local

```bash
npm install
cp .env.local.example .env.local   # renseigner les clés Supabase
npm run dev
npm test        # tests unitaires (node --test)
```

Configuration de Supabase (migrations, lien magique, Google) :
[`docs/SUPABASE.md`](docs/SUPABASE.md). Domaine `nido.4sept.com` et emails
(Resend, récap hebdo) : [`docs/EMAILS.md`](docs/EMAILS.md). Notifications sur le
téléphone : [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md).

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
    ├── menus/               # Dîners de la semaine, bibliothèque de plats
    │   └── tirage.js        # Semaines et tirage au sort avec règles (testé par tirage.test.js)
    ├── courses/             # Stock de la maison, liste de courses générée, commande au drive
    │   └── liste.js         # Construction de la liste par rayon (testé par liste.test.js)
    ├── charge/              # Charge mentale : qui gère quoi chaque mois
    │   └── calculs.js       # Mois, répartition des points (testé par calculs.test.js)
    ├── sport/               # Séances de la semaine, envoi des invitations d'agenda
    ├── echeances/           # Échéances du foyer (impôts, assurances…) et rappels
    ├── listes/              # Listes partagées (films à voir, choses à faire…), invitations
    ├── finances/            # Dépenses du compte commun par poste
    ├── plus/                # Onglet « Plus » (modules hors barre d'onglets)
    ├── coffre/              # Mots de passe partagés, chiffrés de bout en bout
    │   ├── crypto.js        # Clé maîtresse, enveloppes phrase/PRF (WebCrypto), testé par crypto.test.js
    │   ├── biometrie.js     # Face ID / Touch ID : passkey WebAuthn + extension PRF
    │   └── CoffreProvider.jsx # Clé en mémoire, verrouillage auto
    └── activites/           # Ex-site anniversaire
        ├── Activites.jsx    # Sous-navigation
        ├── Quiz.jsx         # Idées d'activités (5 questions)
        ├── CarnetActivites.jsx
        ├── CarteVoyages.jsx
        ├── MurMessages.jsx
        ├── ModeSurprise.jsx # Ex-écran d'accueil animé (mot de passe → quiz)
        ├── ReglagesSurprise.jsx
        └── data/
api/recap.js                 # Fonction Vercel : récap par email (tâche planifiée + aperçu)
api/action.js                # Fonction Vercel : boutons d'action de l'email (jetons signés)
api/sport.js                 # Fonction Vercel : invitations d'agenda (.ics) des séances de sport
api/echeances.js             # Fonction Vercel : rappel immédiat d'une échéance (email + notification)
api/invitation.js            # Fonction Vercel : invitation d'agenda depuis un élément de liste
api/notifications.js         # Fonction Vercel : notification de test (les envois planifiés passent par api/recap.js)
api/activite.js              # Fonction Vercel : notifications des actions des autres membres
public/sw.js                 # Service worker : réception des notifications
api/_lib/                    # Planning, contenu de l'email, envoi (testés)
supabase/migrations/         # Schéma SQL, à exécuter dans l'ordre
```

## Routes

| Route | Page |
|---|---|
| `/connexion` | Lien magique / Google |
| `/bienvenue` | Créer ou rejoindre un espace |
| `/rejoindre/:code` | Accepter une invitation |
| `/` | Aujourd'hui : dîner du soir, prochaine échéance, charges, courses, dépenses du mois ; avatar vers les réglages |
| `/plus` | Onglet « Plus » : Finances, Échéances, Listes, Sport, Activités, Mots de passe, Réglages |
| `/espace` | Réglages façon iOS : profil, membres, espaces, notifications, emails, apparence (une page par section, `/espace/<section>`) |
| `/courses` | Liste de courses et stock de la maison |
| `/finances` | Dépenses du mois par poste, comparaison avec le mois précédent |
| `/charge/equilibre` | Équilibre de la charge mentale sur 6 mois |
| `/courses/drive` | Commander au drive (Carrefour, Leclerc) : liens produits, prix, commande passée |
| `/menus` | Dîners de la semaine et bibliothèque de plats |
| `/charge` | Charge mentale du mois |
| `/coffre` | Coffre à mots de passe |
| `/activites/idees` · `carnet` · `voyages` · `messages` | Partie Activités |
| `/activites/surprise` | Mots de passe du mode surprise |
| `/surprise` | Mode surprise (plein écran, enchaîne sur le quiz) |

## Déployer

Vercel : renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les
variables d'environnement du projet, puis ajouter l'URL de production dans
les *Redirect URLs* de Supabase.
