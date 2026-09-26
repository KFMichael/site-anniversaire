# Backlog — Nido

Application pour organiser la vie courante d'un couple (ou d'une coloc,
d'un groupe d'amis) : répartition de la charge mentale, courses, menus,
sport, mots de passe partagés, récap hebdomadaire.

Le site anniversaire d'origine est archivé sur la branche
`archive/site-anniversaire`. Ses écrans sont conservés dans la partie
**Activités** (quiz d'idées, carnet, voyages, messages, mode surprise).

## Décisions prises

| Sujet | Décision |
|---|---|
| Repo | Même repo, code réorganisé par fonctionnalité (`src/features/*`) |
| Espaces | Multi-espaces dès le départ : chaque couple / groupe a son espace, données isolées par RLS |
| Connexion | Lien magique par email + Google |
| Charge mentale | Chacun coche librement ; **un seul owner par charge** ; poids de chaque charge représenté visuellement |
| Courses | « Presque fini » ajoute le produit à la liste avec une couleur spécifique ; « Fini » l'ajoute normalement |
| Sport | Séances **ensemble**, synchronisées avec **Google Calendar** |
| Mots de passe | Coffre chiffré côté navigateur avec une **phrase secrète** partagée ; le serveur ne voit jamais les mots de passe en clair |
| Menus | **Dîner uniquement**, tirage aléatoire avec règles |
| Nom | **Nido** (provisoire, modifiable dans `src/config.js`) |

## Propositions à valider

**Poids des charges** — 3 niveaux, affichés en jauge par personne (total de
points de chacun sur le mois) :

| Charge | Poids |
|---|---|
| Gérer les finances | ●●● lourd |
| Faire le menu de la semaine | ●● moyen |
| Aller faire les courses | ●● moyen |
| Faire la lessive | ●● moyen |
| Faire la liste des courses | ● léger |
| Gérer la femme de ménage | ● léger |
| Trouver les activités à faire | ● léger |
| Prévoir les séances de sport | ● léger |

Chaque espace peut modifier les charges et leur poids.

**Règles du tirage des menus** (chacune activable) :
- pas deux fois le même plat dans la semaine ;
- pas un plat servi la semaine précédente ;
- au plus N plats d'une même catégorie (pâtes, poisson, viande…) par semaine ;
- plats « rapides » du lundi au jeudi, plats « longs » possibles le week-end ;
- un jour verrouillé n'est pas re-tiré.

**Récap hebdo** — email le **dimanche à 19h** (réglable par espace), puis
notification push en phase 7. Contenu personnalisé par membre :
1. tes charges du mois ;
2. les dîners de la semaine ;
3. les séances de sport prévues ;
4. la liste de courses en cours (avec les « presque fini ») ;
5. le 1er du mois : rappel « choisis tes charges », avec les charges sans owner.

## Phases

### Phase 0 — Socle ✅
- [x] Archiver le site anniversaire (`archive/site-anniversaire`)
- [x] Réorganiser le code (`src/features/*`), garder l'ex-site en partie Activités
- [x] Connexion par lien magique et Google (Supabase Auth)
- [x] Espaces : création, lien d'invitation (7 jours, multi-usage), membres, plusieurs espaces par personne
- [x] RLS : chaque table filtrée par appartenance à l'espace
- [x] Barre d'onglets en bas, tableau de bord des modules
- [x] Manifest PWA (installable sur l'écran d'accueil)
- [ ] Icônes PNG 180/192/512 pour l'écran d'accueil iOS/Android

### Phase 1 — Charge mentale
- [ ] Table `charges` (nom, poids, emoji, archivée) avec liste par défaut à la création de l'espace
- [ ] Table `attributions` (charge, mois, owner) — contrainte : un seul owner par charge et par mois
- [ ] Écran du mois : chaque charge est une carte, on la « prend » d'un tap
- [ ] Jauge de poids par membre, et alerte sur les charges sans owner
- [ ] Gestion des charges (ajout, modification du poids, archivage)
- [ ] Tableau de bord : « Ce mois-ci, tu gères… »
- [ ] Historique des mois précédents

### Phase 2 — Courses
- [ ] Catalogue des produits de la maison, par rayon
- [ ] État par produit : il en reste / presque fini / fini
- [ ] Liste de courses générée : « fini » ajouté normalement, « presque fini » ajouté en couleur spécifique
- [ ] Ajout manuel d'articles ponctuels
- [ ] Mode magasin : cocher = acheté, le produit repasse à « il en reste »
- [ ] Synchronisation temps réel (Supabase Realtime)

### Phase 3 — Menus
- [ ] Bibliothèque de plats (nom, catégorie, rapide/long, ingrédients)
- [ ] Planning des dîners de la semaine
- [ ] Assistant de tirage aléatoire avec les règles ci-dessus, verrouillage par jour
- [ ] Envoi des ingrédients de la semaine vers la liste de courses

### Phase 4 — Récap hebdo
- [ ] Edge Function Supabase + `pg_cron` + Resend (envoi d'email)
- [ ] Email personnalisé par membre (contenu ci-dessus)
- [ ] Rappel du 1er du mois pour choisir ses charges
- [ ] Réglages : jour/heure, désinscription

### Phase 5 — Sport
- [ ] Grille de la semaine, sélection de 3 créneaux de 45 min
- [ ] Connexion Google Calendar de chaque membre (OAuth, jetons stockés côté serveur)
- [ ] Suggestion des créneaux libres pour tous les membres (API free/busy)
- [ ] Création de l'événement dans les agendas des participants

### Phase 6 — Coffre à mots de passe
- [ ] Phrase secrète de l'espace → clé dérivée dans le navigateur (PBKDF2, AES-GCM via WebCrypto)
- [ ] Entrées chiffrées : nom, identifiant, mot de passe, note, catégorie
- [ ] Masquage par défaut, copie en un tap, verrouillage automatique
- [ ] Changement de phrase secrète (rechiffrement)

### Phase 7 — Finitions
- [ ] Notifications push (service worker, Web Push ; iOS : appli installée sur l'écran d'accueil)
- [ ] Statistiques d'équilibre de la charge sur plusieurs mois
- [ ] Voyages de la carte en base (aujourd'hui dans `src/features/activites/data/voyages.js`, commun à tous les espaces)
