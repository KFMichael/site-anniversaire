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
| Sport | Séances **ensemble** ; invitations d'agenda (.ics) ; Google Calendar (créneaux libres) plus tard |
| Mots de passe | Coffre chiffré côté navigateur avec une **phrase secrète** partagée ; le serveur ne voit jamais les mots de passe en clair |
| Menus | **Dîner uniquement**, tirage aléatoire avec règles (pas deux fois le même plat, pas celui de la semaine précédente, au plus N par catégorie, plats rapides en semaine, jours verrouillés) |
| Charges | 3 poids (léger, moyen, lourd), liste par défaut modifiable par espace |
| Récap | Email le dimanche (charges, dîners, sport, courses) et rappel le 1er du mois ; notifications push en complément |
| Nom | **Nido** (provisoire, modifiable dans `src/config.js`) |

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

### Phase 5 — Sport (version simple ✅)
- [x] Semaine par semaine : jusqu'à 3 séances de 45 min (jour + heure), jours passés grisés
- [x] Responsable : le membre qui a pris la charge « sport » du mois planifie, les autres voient en lecture seule (sans responsable ou sans charge « sport » : tout le monde) ; « Je m'en occupe » depuis l'écran
- [x] « Envoyer l'invitation » : un email par séance à chaque membre, avec invitation d'agenda (.ics) acceptée par Google Agenda, Apple Calendrier et Outlook (`api/sport.js`)
- [x] Modification → mise à jour de l'événement (même UID, séquence +1) ; suppression d'une séance envoyée → annulation dans les agendas ; statut par séance (envoyée, à envoyer, modifiée)
- [ ] Connexion Google Calendar de chaque membre (OAuth) et suggestion des créneaux libres (API free/busy)
- [x] Rappel push la veille au soir (« Demain : sport ») ; le rappel 30 min avant vient de l'alarme de l'invitation d'agenda
- [x] Séances de la semaine dans le récap du dimanche (email et notification)

### Phase 6 — Coffre à mots de passe ✅ (réalisée en premier)
- [x] Phrase secrète de l'espace → clé dérivée dans le navigateur (PBKDF2-SHA256 600 000 itérations, AES-GCM 256 via WebCrypto)
- [x] Entrées entièrement chiffrées (nom compris) : nom, catégorie, identifiant, mot de passe, site, note
- [x] Masquage par défaut, copie en un tap (presse-papier vidé après 30 s), générateur de mots de passe
- [x] Clé maîtresse aléatoire, enveloppée par la phrase et par Face ID : changer la phrase ne rechiffre pas les entrées
- [x] Face ID / Touch ID par appareil (passkey WebAuthn + PRF), liste des appareils, retrait
- [x] Verrouillage automatique (5 min d'inactivité, 1 min avec Face ID, rechargement de la page, changement d'espace)
- [x] Changement de phrase secrète
- [x] Réinitialisation du coffre (phrase oubliée), réservée aux admins
- [x] Import d'un export CSV (Apple Mots de passe, Chrome, Edge, Firefox, Bitwarden, 1Password, LastPass, KeePass, Dashlane), lu et chiffré dans le navigateur : aperçu, doublons décochés, catégorie devinée ; modèle CSV à télécharger sur ordinateur
- [ ] Rotation de la clé maîtresse (après le départ d'un membre qui a pu la conserver)

### Qualité — iPhone, accessibilité, erreurs ✅
- [x] Règles du projet dans `CLAUDE.md` : iPhone d'abord (Human Interface Guidelines), accessibilité WCAG 2.1 AA, gestion des erreurs, sécurité des données, vérifications avant push
- [x] Page 404, limite d'erreur globale (dont « nouvelle version » après déploiement), bandeau hors connexion
- [x] Audit axe-core de tous les écrans à 320 et 390 px, clair et sombre : 0 violation ; zones tactiles ≥ 44 pt ; champs ≥ 16 px ; pas de défilement horizontal
- [x] Police système (SF Pro), pas de délai ni de flash au toucher, zones de sécurité, `prefers-reduced-motion`

### Phase 8 — Échéances et listes partagées ✅
- [x] Échéances : titre, catégorie, date, répétition (mensuelle, annuelle), personne concernée, note ; suggestions (déclaration des impôts, taxe foncière, assurances, contrôle technique, loyer…)
- [x] Rappels automatiques par notification (1 mois, 1 semaine, la veille, le jour même), « 🔔 Rappeler » immédiat (email + notification), « Fait » qui passe à la prochaine date, échéances dans le récap du dimanche et sur l'accueil
- [x] Listes partagées (films à voir, choses à faire, restos, idées cadeaux…), cochées en temps réel, « Léa a ajouté Dune à Films à voir »
- [x] « 📅 Proposer » un élément : invitation d'agenda (.ics) à tous les membres, mise à jour ou annulation

### Phase 9 — Commande au drive ✅
- [x] Une enseigne pour l'espace : Carrefour Drive ou Leclerc Drive (adresse du drive du magasin)
- [x] « Commander au drive » depuis la liste : chaque produit manquant ouvre la recherche du site, ou la fiche mémorisée (« Mon produit »)
- [x] Prix constaté par produit et estimation du panier ; « Commande passée » notifie les autres membres, sort les produits commandés de la liste (stock à jour) et ramène à la liste de ce qui manque encore
- [ ] Panier rempli automatiquement : impossible sans API publique des enseignes (seulement par partenariat commercial)

### Phase 11 — Navigation et UI iOS (audit du 30/09)
- [x] Lot 1 — Barre d'onglets Aujourd'hui · Courses · Menus · Charge · Plus ; onglet « Plus » en listes groupées ; accueil « Aujourd'hui » compact ; avatar vers les réglages
- [x] Lot 2 — Gestes iOS : grand titre qui se replie en barre compacte, glisser depuis le bord pour revenir, transitions de page
- [x] Lot 3 — Cohérence : composant d'onglets unique, « + » en haut à droite, feuilles modales pour les formulaires, messages temporaires avec « Annuler », rouge pour les actions destructrices
- [ ] Lot 4 — Écrans : Menus compact, dates courtes, rayon deviné, réglages façon iOS, pastilles sur les onglets

### Phase 10 — Finances ✅
- [x] Dépenses du compte commun par poste (courses, restaurants, activités et sorties, maison, transport, santé, abonnements, vacances, cadeaux, autre), poste deviné depuis le libellé
- [x] Total du mois, comparaison avec le mois précédent, répartition par poste, historique mois par mois
- [x] Montant estimé d'une commande au drive ajouté automatiquement (modifiable)
- [ ] Budget par poste avec alerte en cas de dépassement
- [ ] Dépenses partagées (qui doit combien à qui) : inutile avec un compte commun, à revoir pour une colocation

### Phase 7 — Finitions
- [x] Réglage du thème dans les paramètres : clair / sombre / système (Espace > Apparence, par appareil)
- [x] Notifications push : dîner du soir, récap du dimanche, rappel du 1er ; par appareil, types désactivables, test (`docs/NOTIFICATIONS.md`)
- [x] Notifications en temps réel des actions des autres (« Léa a ajouté lait à la liste », courses faites, charge prise, dîners prévus) : déclencheurs SQL + `api/activite.js`, sans webhook à configurer
- [x] Statistiques d'équilibre de la charge sur plusieurs mois (Charge mentale › « Voir l'équilibre sur 6 mois »)
- [ ] Voyages de la carte en base (aujourd'hui dans `src/features/activites/data/voyages.js`, commun à tous les espaces)
