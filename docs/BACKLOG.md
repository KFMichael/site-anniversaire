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
- [x] Icônes PNG 180/192/512 pour l'écran d'accueil iOS/Android (nid et deux œufs, `design/icone.svg`)

### Phase 1 — Charge mentale ✅
- [x] Table `charges` (nom, poids, emoji, archivée) avec liste par défaut à la création de l'espace
- [x] Table `attributions` (charge, mois, owner) — contrainte : un seul owner par charge et par mois
- [x] Écran du mois : chaque charge est une carte, on la « prend » d'un tap ; mise à jour en temps réel
- [x] Jauge de poids par membre, et alerte sur les charges sans owner
- [x] Gestion des charges (ajout, renommage, poids, archivage)
- [x] Tableau de bord : « Ce mois-ci, tu gères… »
- [x] Historique des mois précédents (lecture seule) ; mois suivant préparable à l'avance
- [x] « Reprendre mes charges du mois dernier »

### Phase 2 — Courses ✅
- [x] Catalogue des produits de la maison, par rayon (39 produits de départ, modifiable)
- [x] État par produit : il en reste / presque fini / fini
- [x] Liste de courses générée : « fini » ajouté normalement, « presque fini » ajouté en couleur spécifique
- [x] Ajout manuel d'articles ponctuels (un nom de produit du stock le marque « fini » au lieu de créer un doublon)
- [x] Mode magasin : cocher = dans le panier ; « Terminer les courses » remet les produits à « il en reste »
- [x] Synchronisation temps réel (Supabase Realtime)
- [x] Quantités : pastille modifiable dans la liste, saisie rapide « 2 lait » / « lait x2 » / « farine 1kg », reprises dans le récap par email

### Phase 3 — Menus ✅
- [x] Bibliothèque de plats (nom, catégorie, rapide/long, ingrédients) : 34 plats de départ, dont 16 ivoiriens / ouest-africains
- [x] Planning des dîners de la semaine (plat ou texte libre : resto, restes…)
- [x] Assistant de tirage aléatoire avec les règles ci-dessus (chacune activable), verrouillage par jour ; un choix manuel verrouille le soir
- [x] Envoi des ingrédients de la semaine vers la liste de courses (manquants pré-cochés, stock et liste détectés)
- [x] Stock enrichi de 31 produits ivoiriens / ouest-africains (attiéké, plantain, igname, gombo, huile et crème de palme…)

### Phase 4 — Récap hebdo ✅
- [x] Fonction Vercel `api/recap.js` + tâche planifiée quotidienne + Resend (plutôt qu'Edge Function + `pg_cron` : déployé avec l'appli, rien à installer)
- [x] Email personnalisé par membre : charges du mois, dîners et courses de la semaine à venir
- [x] Rappel du 1er du mois pour choisir ses charges (fusionné avec le récap si le 1er est un dimanche)
- [x] Désinscription par type d'email, aperçu à la demande, journal anti-doublon
- [x] Boutons d'action en un clic dans l'email : prendre une charge, marquer un article acheté, tirer un autre plat (jetons signés, `api/action.js`)
- [ ] Jour / heure au choix (nécessite une tâche horaire : offre Vercel Pro)

### Phase 5 — Sport
- [ ] Grille de la semaine, sélection de 3 créneaux de 45 min
- [ ] Connexion Google Calendar de chaque membre (OAuth, jetons stockés côté serveur)
- [ ] Suggestion des créneaux libres pour tous les membres (API free/busy)
- [ ] Création de l'événement dans les agendas des participants

### Phase 6 — Coffre à mots de passe ✅ (réalisée en premier)
- [x] Phrase secrète de l'espace → clé dérivée dans le navigateur (PBKDF2-SHA256 600 000 itérations, AES-GCM 256 via WebCrypto)
- [x] Entrées entièrement chiffrées (nom compris) : nom, catégorie, identifiant, mot de passe, site, note
- [x] Masquage par défaut, copie en un tap (presse-papier vidé après 30 s), générateur de mots de passe
- [x] Clé maîtresse aléatoire, enveloppée par la phrase et par Face ID : changer la phrase ne rechiffre pas les entrées
- [x] Face ID / Touch ID par appareil (passkey WebAuthn + PRF), liste des appareils, retrait
- [x] Verrouillage automatique (5 min d'inactivité, 1 min avec Face ID, rechargement de la page, changement d'espace)
- [x] Changement de phrase secrète
- [x] Réinitialisation du coffre (phrase oubliée), réservée aux admins
- [ ] Import depuis un export CSV (navigateur, Bitwarden…)
- [ ] Rotation de la clé maîtresse (après le départ d'un membre qui a pu la conserver)

### Qualité — iPhone, accessibilité, erreurs ✅
- [x] Règles du projet dans `CLAUDE.md` : iPhone d'abord (Human Interface Guidelines), accessibilité WCAG 2.1 AA, gestion des erreurs, sécurité des données, vérifications avant push
- [x] Page 404, limite d'erreur globale (dont « nouvelle version » après déploiement), bandeau hors connexion
- [x] Audit axe-core de tous les écrans à 320 et 390 px, clair et sombre : 0 violation ; zones tactiles ≥ 44 pt ; champs ≥ 16 px ; pas de défilement horizontal
- [x] Police système (SF Pro), pas de délai ni de flash au toucher, zones de sécurité, `prefers-reduced-motion`

### Phase 7 — Finitions
- [x] Réglage du thème dans les paramètres : clair / sombre / système (Espace > Apparence, par appareil)
- [ ] Notifications push (service worker, Web Push ; iOS : appli installée sur l'écran d'accueil)
- [ ] Statistiques d'équilibre de la charge sur plusieurs mois
- [ ] Voyages de la carte en base (aujourd'hui dans `src/features/activites/data/voyages.js`, commun à tous les espaces)
