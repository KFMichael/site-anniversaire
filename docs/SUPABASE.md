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

**Authentication > URL Configuration**
- *Site URL* : l'URL de production (ex. `https://nido.vercel.app`)
- *Redirect URLs* : ajouter `https://<prod>/**` et `http://localhost:5173/**`
  (le lien magique ramène sur la page demandée, ex. `/rejoindre/<code>`)

**Authentication > Providers**
- *Email* : activé (lien magique, aucun mot de passe)
- *Google* : activer, puis renseigner le Client ID / Secret créés dans
  Google Cloud Console (*APIs & Services > Credentials > OAuth client ID*,
  type « Web application », URI de redirection autorisée :
  `https://<projet>.supabase.co/auth/v1/callback`)

**Authentication > Email Templates > Magic Link** (optionnel) : traduire le
texte en français.

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
