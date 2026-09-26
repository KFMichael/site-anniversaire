# Configuration Supabase

## 1. Exécuter les migrations

Dans **Supabase > SQL Editor**, exécuter dans l'ordre le contenu de :

1. `supabase/migrations/0001_espaces.sql` — profils, espaces, membres, invitations, RLS
2. `supabase/migrations/0002_activites_par_espace.sql` — rattache le carnet, les messages et les mots de passe du mode surprise à un espace
3. `supabase/migrations/0003_coffre.sql` — coffre à mots de passe (données chiffrées uniquement)

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
