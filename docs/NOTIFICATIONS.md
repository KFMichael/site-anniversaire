# Notifications sur le téléphone (Web Push)

| Notification | Quand | Écran ouvert au toucher |
|---|---|---|
| 🍽️ Ce soir : *plat* | tous les jours (tâche de 17 h UTC), s'il y a un dîner prévu | Menus |
| 🧾 *Échéance* : dans 7 jours | selon les rappels choisis (1 mois, 1 semaine, la veille, le jour même), à la personne concernée ou à tous | Échéances |
| 🏃 Demain : sport | tous les jours, s'il y a une séance le lendemain (la veille au soir) | Sport |
| 📋 Ta semaine est prête (charges, dîners, séances, courses) | le dimanche | Accueil |
| 🧠 *Mois* : choisis ta charge mentale | le 1er du mois | Charge |
| 🛒 Léa a ajouté lait, pain et œufs | quelques secondes après une action d'un autre membre | Courses, Charge ou Menus |

Le rappel juste avant une séance de sport vient de l'agenda : l'invitation
envoyée depuis Nido contient une alarme 30 min avant, dans Google Agenda,
Apple Calendrier ou Outlook, pour qui l'a acceptée. La tâche quotidienne de
Vercel (offre gratuite) ne tourne qu'une fois par jour, d'où le rappel la
veille au soir.

Chaque membre active les notifications **par appareil** (Espace >
Notifications) et peut couper chaque type. Un bouton envoie une
notification de test.

**iPhone** : iOS 16.4 ou plus, et Nido **installé sur l'écran d'accueil**
(Safari > Partager > Sur l'écran d'accueil), puis ouvert depuis l'icône.
L'appli affiche ces instructions quand ce n'est pas le cas.

## Mise en place

1. Supabase : exécuter `supabase/migrations/0009_notifications.sql`.
2. Générer une paire de clés VAPID (identifie Nido auprès des services de
   notification d'Apple, Google, Mozilla) :
   `npx web-push generate-vapid-keys`
3. Vercel > Settings > Environment Variables (Production et Preview) :

   | Nom | Valeur |
   |---|---|
   | `VITE_VAPID_CLE_PUBLIQUE` | la clé publique (« Public Key ») |
   | `VAPID_CLE_PRIVEE` | la clé privée (« Private Key »), secrète |

4. Redéployer. La carte « Notifications » apparaît dans Espace ; sans ces
   variables, elle reste masquée et les emails fonctionnent normalement.

> Changer de clés VAPID invalide tous les abonnements existants : chaque
> membre devra réactiver les notifications sur ses appareils.

## Fonctionnement

- `public/sw.js` : service worker, uniquement pour recevoir les
  notifications et ouvrir le bon écran (aucun cache).
- `src/lib/push.js` : état de l'appareil, abonnement, désabonnement ;
  l'abonnement est enregistré par la fonction `enregistrer_abonnement_push`
  (un appareil appartient au compte qui y est connecté).
- `api/_lib/notifications.js` : envois planifiés, appelés par la tâche
  quotidienne `api/recap.js` ; journal anti-doublon partagé avec les
  emails (`envois_recap`, types `push-…`) ; abonnements expirés supprimés.
- `api/notifications.js` : notification de test.

## Actions des autres membres

Quand un membre ajoute quelque chose à la liste, termine les courses, prend
une charge ou prévoit un dîner, les autres membres reçoivent une
notification : « Léa a ajouté lait, pain et œufs », « Léa a acheté… »,
« Léa prend « Finances » », « Léa a prévu Garba ». On ne reçoit jamais ses
propres actions. Chacun peut les couper (« Actions des autres »).

- Des déclencheurs SQL (`0011_activite.sql`) notent chaque action dans
  `evenements`. Seuls ces déclencheurs y écrivent : un membre ne peut pas
  fabriquer un événement.
- Après une action, l'appli attend 15 s sans nouvelle action (ou que
  l'appli passe en arrière-plan), puis appelle `api/activite.js`.
- `api/_lib/activite.js` réclame les événements pas encore notifiés de
  l'espace (un seul envoi même si deux appareils appellent en même temps),
  les regroupe par auteur et par type, écarte ce qui n'est plus sur la
  liste ou date de plus de 2 h, et supprime ceux de plus de 30 jours.

Rien à configurer en plus : les mêmes clés VAPID que ci-dessus, et la
migration `0011_activite.sql`.
