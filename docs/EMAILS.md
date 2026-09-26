# Domaine et emails — nido.4sept.com

| Usage | Adresse |
|---|---|
| Application | `https://nido.4sept.com` |
| Récap hebdo / rappel mensuel | `Nido <recap@nido.4sept.com>` |
| Liens magiques de connexion | `Nido <connexion@nido.4sept.com>` |

Tout passe par le sous-domaine `nido` : le reste de `4sept.com` n'est pas
touché. Les enregistrements DNS de Resend (`send.nido`, `resend._domainkey.nido`)
ne gênent pas le CNAME de l'application (`nido`).

## 1. L'application sur nido.4sept.com (Vercel)

1. Vercel > projet > **Settings > Domains** > ajouter `nido.4sept.com`.
2. Chez le registrar de `4sept.com`, créer l'enregistrement indiqué par
   Vercel (en général `CNAME nido → cname.vercel-dns.com`).
3. Supabase > **Authentication > URL Configuration** :
   - *Site URL* : `https://nido.4sept.com`
   - *Redirect URLs* : ajouter `https://nido.4sept.com/**`

> Face ID (coffre) : les passkeys sont liées au domaine. Activer Face ID
> sur `nido.4sept.com`, une fois le domaine en place.

## 2. Resend (envoi des emails)

1. Créer un compte sur [resend.com](https://resend.com).
2. **Domains > Add domain** : `nido.4sept.com`, région au choix (UE).
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
| `RECAP_EXPEDITEUR` | `Nido <recap@nido.4sept.com>` |
| `APP_URL` | `https://nido.4sept.com` |
| `RECAP_FUSEAU` | `Europe/Paris` (ou `Africa/Abidjan`…) |

La tâche planifiée (`vercel.json`) appelle `/api/recap` tous les jours à
17 h UTC (19 h à Paris l'été, 18 h l'hiver) : elle envoie le récap le
dimanche et le rappel le 1er du mois, et ne fait rien les autres jours.

### Boutons d'action dans l'email

Le récap contient des boutons en un clic : **Je prends** (charge sans
responsable), **✓ Acheté** (article de la liste), **🎲 Autre / Au hasard**
(dîner d'un soir). Chaque bouton porte un jeton signé (HMAC, clé dérivée de
`CRON_SECRET`), valable 8 jours, limité à un membre, un espace et une
action. Le lien ouvre `/api/action`, qui déclenche l'action par un script
dans le navigateur : les antivirus de messagerie qui analysent les liens
n'exécutent pas ce script et ne déclenchent donc rien. Aucune variable
supplémentaire à configurer.

## 4. Liens magiques via Resend (Supabase)

L'envoi intégré à Supabase est limité à quelques emails par heure. Supabase >
**Authentication > Emails > SMTP Settings** > *Enable custom SMTP* :

| Champ | Valeur |
|---|---|
| Sender email | `connexion@nido.4sept.com` |
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
