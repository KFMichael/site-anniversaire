-- Coffre à mots de passe partagé, chiffré de bout en bout.
--
-- Tout le chiffrement a lieu dans le navigateur (src/features/coffre/crypto.js) :
-- la clé AES-GCM est dérivée de la phrase secrète de l'espace (PBKDF2) et ne
-- quitte jamais l'appareil. La base ne stocke que du chiffré : ni la phrase,
-- ni la clé, ni même le nom des entrées ne sont lisibles côté serveur.

-- Un coffre par espace : paramètres de dérivation + vérificateur (une valeur
-- connue chiffrée avec la clé, qui permet de savoir si la phrase saisie est
-- la bonne sans stocker la phrase elle-même)
create table public.coffres (
  espace_id uuid primary key references public.espaces (id) on delete cascade,
  sel text not null,
  iterations int not null check (iterations >= 100000),
  verificateur_iv text not null,
  verificateur text not null,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entrees_coffre (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.coffres (espace_id) on delete cascade,
  -- JSON chiffré {nom, categorie, identifiant, motDePasse, url, note}
  iv text not null,
  chiffre text not null,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entrees_coffre_espace_id_idx on public.entrees_coffre (espace_id);

alter table public.coffres enable row level security;
alter table public.entrees_coffre enable row level security;

create policy "coffres_lecture" on public.coffres for select
  using (public.est_membre(espace_id));

create policy "coffres_creation" on public.coffres for insert
  with check (public.est_membre(espace_id));

-- Nécessaire au changement de phrase (changer_phrase_coffre est en
-- security invoker : sans cette policy, l'update ne toucherait aucune ligne)
create policy "coffres_modification" on public.coffres for update
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Réinitialiser le coffre (phrase oubliée) efface toutes les entrées :
-- réservé aux admins de l'espace
create policy "coffres_suppression" on public.coffres for delete
  using (public.est_admin(espace_id));

create policy "entrees_coffre_membres" on public.entrees_coffre for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Changement de phrase secrète : le navigateur a rechiffré toutes les
-- entrées avec la nouvelle clé, on remplace tout dans une seule transaction.
-- security invoker : la RLS ci-dessus s'applique normalement.
--
-- p_entrees : [{ "id": uuid, "iv": text, "chiffre": text }, ...]
-- Refuse si une entrée a été ajoutée ou supprimée entretemps (elle resterait
-- chiffrée avec l'ancienne clé, donc illisible).
create or replace function public.changer_phrase_coffre(
  p_espace_id uuid,
  p_sel text,
  p_iterations int,
  p_verificateur_iv text,
  p_verificateur text,
  p_entrees jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  nb_existantes int;
  nb_modifiees int;
begin
  if not public.est_membre(p_espace_id) then
    raise exception 'Accès refusé';
  end if;

  -- Verrouille le coffre : deux changements simultanés s'exécutent l'un
  -- après l'autre, le second échoue sur le contrôle ci-dessous
  perform 1 from public.coffres where espace_id = p_espace_id for update;

  select count(*) into nb_existantes
  from public.entrees_coffre where espace_id = p_espace_id;

  if nb_existantes <> jsonb_array_length(p_entrees) then
    raise exception 'Le coffre a changé pendant l''opération, recommence';
  end if;

  update public.entrees_coffre e
  set iv = x.iv, chiffre = x.chiffre, updated_at = now()
  from jsonb_to_recordset(p_entrees) as x (id uuid, iv text, chiffre text)
  where e.id = x.id and e.espace_id = p_espace_id;

  get diagnostics nb_modifiees = row_count;
  if nb_modifiees <> nb_existantes then
    raise exception 'Le coffre a changé pendant l''opération, recommence';
  end if;

  update public.coffres
  set sel = p_sel,
      iterations = p_iterations,
      verificateur_iv = p_verificateur_iv,
      verificateur = p_verificateur,
      updated_at = now()
  where espace_id = p_espace_id;

  -- Filet de sécurité : si les paramètres n'ont pas été enregistrés, les
  -- entrées rechiffrées seraient illisibles -> on annule toute la transaction
  get diagnostics nb_modifiees = row_count;
  if nb_modifiees <> 1 then
    raise exception 'Coffre introuvable';
  end if;
end;
$$;

revoke execute on function public.changer_phrase_coffre(uuid, text, int, text, text, jsonb) from public, anon;
grant execute on function public.changer_phrase_coffre(uuid, text, int, text, text, jsonb) to authenticated;
