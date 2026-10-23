# Domaine et emails — nido.fmichael.cloud

| Usage | Adresse |
|---|---|
| Application | `https://nido.fmichael.cloud` |
| Récap hebdo / rappel mensuel | `Nido <recap@nido.fmichael.cloud>` |
| Liens magiques de connexion | `Nido <connexion@nido.fmichael.cloud>` |

Tout passe par le sous-domaine `nido` : le reste de `fmichael.cloud` n'est pas
touché. Les enregistrements DNS de Resend (`send.nido`, `resend._domainkey.nido`)
ne gênent pas le CNAME de l'application (`nido`).

## 1. L'application sur nido.fmichael.cloud (Vercel)

1. Vercel > projet > **Settings > Domains** > ajouter `nido.fmichael.cloud`.
2. Chez le registrar de `fmichael.cloud`, créer l'enregistrement indiqué par
   Vercel (en général `CNAME nido → cname.vercel-dns.com`).
3. Supabase > **Authentication > URL Configuration** :
   - *Site URL* : `https://nido.fmichael.cloud`
   - *Redirect URLs* : ajouter `https://nido.fmichael.cloud/**`

> Face ID (coffre) : les passkeys sont liées au domaine. Activer Face ID
> sur `nido.fmichael.cloud`, une fois le domaine en place.

### Ancien domaine nido.4sept.com (octobre 2026)

L'appli est passée de `nido.4sept.com` à `nido.fmichael.cloud`.

- Vercel > **Settings > Domains** : garder `nido.4sept.com`, en
  *Redirect to* `nido.fmichael.cloud` (308), pour que les anciens liens
  (emails déjà reçus, favoris) mènent toujours à l'appli.
- Tout ce que le navigateur garde est propre à chaque domaine : sur chaque
  appareil, se reconnecter sur le nouveau domaine, **réinstaller l'icône**
  sur l'écran d'accueil (supprimer l'ancienne), réactiver **Face ID** dans
  le coffre (déverrouillage par le mot de passe maître d'abord) et les
  **notifications** (Réglages › Notifications).
- Les invitations d'agenda déjà envoyées depuis l'ancien domaine ne sont
  plus mises à jour (identifiants différents) : les supprimer à la main de
  l'agenda si besoin.

## 2. Resend (envoi des emails)

1. Créer un compte sur [resend.com](https://resend.com).
2. **Domains > Add domain** : `nido.fmichael.cloud`, région au choix (UE).
3. Ajouter chez le registrar les enregistrements affichés par Resend
   (MX et TXT sur `send.nido`, TXT DKIM sur `resend._domainkey.nido`),
   puis **Verify**. Compter de quelques minutes à quelques heures.
4. **API Keys > Create API key** (permission *Sending access*), la copier.

## 3. Variables d'environnement Vercel

Vercel > projet > **Settings > Environment Variables** (environnement
*Production*), puis redéployer :

| Nom | Valeur |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > clé `service_role` (secrète, jamais dans le code) |
| `RESEND_API_KEY` | la clé créée à l'étape 2 |
| `CRON_SECRET` | une longue chaîne aléatoire (ex. générée par un gestionnaire de mots de passe) |
| `RECAP_EXPEDITEUR` | `Nido <recap@nido.fmichael.cloud>` |
| `APP_URL` | `https://nido.fmichael.cloud` |
| `RECAP_FUSEAU` | `Europe/Paris` (ou `Africa/Abidjan`…) |

La tâche planifiée (`vercel.json`) appelle `/api/recap` tous les jours à
17 h UTC (19 h à Paris l'été, 18 h l'hiver) : elle envoie le récap le
dimanche et le rappel le 1er du mois, et ne fait rien les autres jours.

Le récap du dimanche contient, pour la semaine à venir : tes charges du
mois, les dîners, les séances de sport (heure du foyer, séances annulées
exclues ; « Planifier » s'il n'y en a pas), les échéances en retard ou
dans les 30 jours, et la liste de courses.

Autres emails : rappel immédiat d'une échéance (bouton « 🔔 Rappeler »,
`api/echeances.js`) et invitation d'agenda depuis une liste partagée
(« 📅 », `api/invitation.js`, fichier .ics comme pour le sport).

### Boutons d'action dans l'email

Le récap contient des boutons en un clic : **Je prends** (charge sans
responsable), **✓ Acheté** (article de la liste), **🎲 Autre / Au hasard**
(dîner d'un soir). Chaque bouton porte un jeton signé (HMAC, clé dérivée de
`CRON_SECRET`), valable 8 jours, limité à un membre, un espace et une
action. Le lien ouvre `/api/action`, qui déclenche l'action par un script
dans le navigateur : les antivirus de messagerie qui analysent les liens
n'exécutent pas ce script et ne déclenchent donc rien. Aucune variable
supplémentaire à configurer.

### Invitations des séances de sport

Depuis **Sport**, « Envoyer l'invitation » appelle `/api/sport` : chaque
membre reçoit un email par séance, expédié par `RECAP_EXPEDITEUR`, avec une
invitation d'agenda (`.ics`, méthode REQUEST ou CANCEL). Gmail, Apple Mail
et Outlook proposent « Accepter » et l'ajoutent à l'agenda ; une
modification met à jour le même événement, une suppression l'annule.
Aucune variable supplémentaire (heures affichées dans `RECAP_FUSEAU`).

## 4. Liens magiques via Resend (Supabase)

L'envoi intégré à Supabase est limité à quelques emails par heure. Supabase >
**Authentication > Emails > SMTP Settings** > *Enable custom SMTP* :

| Champ | Valeur |
|---|---|
| Sender email | `connexion@nido.fmichael.cloud` |
| Sender name | `Nido` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé d'API Resend |

## 5. Vérifier

1. Dans Nido > **Espace > Emails**, « M'envoyer un aperçu » : l'email arrive
   dans la minute (sinon, le message affiché indique la cause).
2. Vercel > projet > **Settings > Cron Jobs** : la tâche `/api/recap` est
   listée ; « Run » la déclenche (elle n'envoie rien hors dimanche / 1er).
