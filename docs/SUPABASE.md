# Configuration Supabase

## 1. Exécuter les migrations

Dans **Supabase > SQL Editor**, exécuter dans l'ordre le contenu de :

1. `supabase/migrations/0001_espaces.sql` — profils, espaces, membres, invitations, RLS
2. `supabase/migrations/0002_activites_par_espace.sql` — rattache le carnet, les messages et les mots de passe du mode surprise à un espace
3. `supabase/migrations/0003_coffre.sql` — coffre à mots de passe et appareils Face ID (données chiffrées uniquement)
4. `supabase/migrations/0004_charge_mentale.sql` — charges (liste par défaut ajoutée à chaque espace) et attributions mensuelles
5. `supabase/migrations/0005_courses.sql` — stock des produits (catalogue de départ ajouté à chaque espace) et articles ponctuels
6. `supabase/migrations/0006_menus.sql` — plats (dont cuisine ivoirienne / ouest-africaine), dîners de la semaine, règles du tirage ; ajoute aussi des produits ouest-africains au stock
7. `supabase/migrations/0007_recap.sql` — préférences des emails et journal des envois (configuration de l'envoi : `docs/EMAILS.md`)
8. `supabase/migrations/0008_quantites.sql` — quantités sur la liste de courses
9. `supabase/migrations/0009_notifications.sql` — notifications sur le téléphone : appareils abonnés et préférences (mise en place : `docs/NOTIFICATIONS.md`)
10. `supabase/migrations/0010_sport.sql` — séances de sport de la semaine et suivi des invitations envoyées
11. `supabase/migrations/0011_activite.sql` — journal des actions (ajouts à la liste, courses faites, charges prises, dîners prévus) pour les notifications aux autres membres
12. `supabase/migrations/0012_rappel_sport.sql` — préférence du rappel de sport la veille au soir
13. `supabase/migrations/0013_echeances_listes.sql` — échéances avec rappels, listes partagées et invitations, préférence des rappels d'échéances
14. `supabase/migrations/0014_reparer_charges.sql` — réparation de la charge mentale si 0004 s'est arrêtée en cours de route (0 charge visible, « 403 » à l'ajout) ; sans effet sinon, peut être relancée
15. `supabase/migrations/0015_drive.sql` — commande au drive : enseigne de l'espace (Carrefour ou Leclerc), lien et prix de « mon produit », commandes passées annoncées aux autres membres
16. `supabase/migrations/0016_finances.sql` — finances : dépenses du compte commun par poste (courses, restaurants, activités…), montant des commandes au drive reporté automatiquement
17. `supabase/migrations/0017_budgets.sql` — budgets mensuels par poste ; alerte (notification aux autres membres) quand une dépense fait atteindre 80 % du budget ou le dépasse
18. `supabase/migrations/0018_voyages.sql` — voyages de la carte (Activités › Voyages), propres à chaque espace

> **Vérifier les règles d'accès** : cette requête liste les tables dont la
> sécurité (RLS) est activée mais sans aucune règle, donc inutilisables
> depuis l'appli. Elle doit renvoyer une liste vide.
>
> ```sql
> select c.relname as table_sans_regle
> from pg_class c join pg_namespace n on n.oid = c.relnamespace
> where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
>   and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname);
> ```

> Si une première version de `0003_coffre.sql` a déjà été exécutée (avant
> l'ajout de Face ID), la supprimer d'abord :
> `drop table if exists cles_appareils, entrees_coffre, coffres cascade;
> drop function if exists changer_phrase_coffre;` puis exécuter la nouvelle.

La migration 0002 **supprime les anciennes policies** des tables
`activites_carnet`, `messages_proches` et `mots_passe_accueil` (accès
anonyme du site anniversaire) et les remplace par un accès réservé aux
membres de l'espace.

> Stockage : si le bucket `photos-carnet` avait une policy d'envoi anonyme
> créée à la main, la supprimer dans **Storage > Policies** ; la migration
> ajoute une policy réservée aux membres.

## 2. Authentification

**Authentication > URL Configuration** (indispensable)
- *Site URL* : `https://nido.4sept.com` (par défaut `http://localhost:3000` :
  les liens des emails de connexion renverraient vers localhost)
- *Redirect URLs* : ajouter `https://nido.4sept.com/**`,
  `https://*-km-d526.vercel.app/**` (aperçus Vercel) et
  `http://localhost:5173/**`. Le lien magique ramène sur la page demandée
  (ex. `/rejoindre/<code>`) ; une adresse absente de cette liste est
  remplacée par la *Site URL*.

**Authentication > Providers**
- *Email* : activé (lien magique, aucun mot de passe)
- *Google* (facultatif) : activer, puis renseigner le Client ID / Secret
  créés dans Google Cloud Console (*APIs & Services > Credentials > OAuth
  client ID*, type « Web application », URI de redirection autorisée :
  `https://<projet>.supabase.co/auth/v1/callback`). Ensuite seulement,
  ajouter `VITE_CONNEXION_GOOGLE=true` dans Vercel et redéployer : le bouton
  « Continuer avec Google » est masqué sans cette variable.

**Authentication > Email Templates** (indispensable pour la connexion par
code) : l'appli demande le **code à 6 chiffres** reçu par email (il marche
aussi dans Nido installé sur l'écran d'accueil, où un lien s'ouvrirait dans
Safari). Les modèles par défaut de Supabase ne contiennent que le lien :
coller ceux-ci. Un nouveau membre reçoit « Confirm signup », un membre déjà
inscrit « Magic Link ».

- *Confirm signup* — sujet : `Ton code Nido : {{ .Token }}`

  ```html
  <h2>Bienvenue sur Nido 🪺</h2>
  <p>Ton code de connexion :</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0 16px;">{{ .Token }}</p>
  <p>Tape-le dans Nido. Tu peux aussi toucher ce bouton :</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background:#0071EB;color:#FFFFFF;border-radius:999px;text-decoration:none;font-weight:600;">Me connecter</a></p>
  <p style="color:#6B6B70;font-size:13px;">Le code est valable une heure. Tu n'as rien demandé ? Ignore simplement cet email.</p>
  ```

- *Magic Link* — même sujet et même contenu, avec « Connexion à Nido 🪺 »
  comme titre.

> L'envoi d'emails intégré à Supabase est limité à quelques emails par
> heure : suffisant pour tester, à remplacer par un SMTP (Resend…) avant
> d'inviter d'autres couples. Le même service servira au récap hebdo.

## 3. Récupérer les données du site anniversaire

Après la migration, les lignes existantes n'appartiennent à aucun espace et
ne sont plus visibles. Une fois connecté·e et votre espace créé :

```sql
-- Retrouver l'id de l'espace
select id, nom from espaces;

-- Rattacher les anciennes données
update activites_carnet   set espace_id = '<id-espace>' where espace_id is null;
update messages_proches   set espace_id = '<id-espace>' where espace_id is null;
update mots_passe_accueil set espace_id = '<id-espace>' where espace_id is null;
```

Les photos déjà envoyées restent accessibles (URL publiques inchangées).
