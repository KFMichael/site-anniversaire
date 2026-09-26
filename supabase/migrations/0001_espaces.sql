-- Espaces partagés (couple, colocation, groupe d'amis) : chaque donnée de
-- l'application appartient à un espace, et n'est visible que par ses membres.
--
-- À exécuter dans Supabase > SQL Editor (ou `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profils : une ligne par utilisateur, créée automatiquement à l'inscription
-- ---------------------------------------------------------------------------

create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  prenom text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (id, email, prenom)
  values (
    new.id,
    new.email,
    -- Google fournit given_name / full_name ; avec un lien magique on n'a
    -- que l'email, on prend alors la partie avant le @ (modifiable ensuite)
    coalesce(
      nullif(new.raw_user_meta_data ->> 'given_name', ''),
      nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Utilisateurs déjà inscrits avant cette migration
insert into public.profils (id, email, prenom)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Espaces et membres
-- ---------------------------------------------------------------------------

create table public.espaces (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(trim(nom)) between 1 and 60),
  cree_par uuid references public.profils (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.membres_espace (
  espace_id uuid not null references public.espaces (id) on delete cascade,
  user_id uuid not null references public.profils (id) on delete cascade,
  role text not null default 'membre' check (role in ('admin', 'membre')),
  created_at timestamptz not null default now(),
  primary key (espace_id, user_id)
);

create index membres_espace_user_id_idx on public.membres_espace (user_id);

-- Liens d'invitation : un code réutilisable jusqu'à expiration, pour pouvoir
-- inviter plusieurs personnes (groupe d'amis) avec le même lien
create table public.invitations (
  code text primary key default encode(gen_random_bytes(8), 'hex'),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  expire_le timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions d'appartenance, utilisées par toutes les policies RLS.
-- security definer : elles lisent membres_espace sans repasser par la RLS de
-- cette table (sinon récursion infinie dans ses propres policies).
-- ---------------------------------------------------------------------------

create or replace function public.est_membre(p_espace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membres_espace
    where espace_id = p_espace_id and user_id = auth.uid()
  );
$$;

create or replace function public.est_admin(p_espace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membres_espace
    where espace_id = p_espace_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profils enable row level security;
alter table public.espaces enable row level security;
alter table public.membres_espace enable row level security;
alter table public.invitations enable row level security;

-- Profils : on voit le sien et ceux des personnes avec qui on partage un espace
create policy "profils_lecture" on public.profils for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.membres_espace m
      where m.user_id = profils.id and public.est_membre(m.espace_id)
    )
  );

create policy "profils_modification" on public.profils for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Espaces : création uniquement via creer_espace() (qui ajoute le créateur
-- comme admin dans la même transaction)
create policy "espaces_lecture" on public.espaces for select
  using (public.est_membre(id));

create policy "espaces_modification" on public.espaces for update
  using (public.est_admin(id))
  with check (public.est_admin(id));

create policy "espaces_suppression" on public.espaces for delete
  using (public.est_admin(id));

-- Membres : ajout uniquement via creer_espace() / rejoindre_espace()
create policy "membres_lecture" on public.membres_espace for select
  using (public.est_membre(espace_id));

create policy "membres_suppression" on public.membres_espace for delete
  using (user_id = auth.uid() or public.est_admin(espace_id));

-- Invitations : gérées par les membres ; la lecture d'une invitation par
-- quelqu'un d'extérieur passe par apercu_invitation()
create policy "invitations_lecture" on public.invitations for select
  using (public.est_membre(espace_id));

create policy "invitations_creation" on public.invitations for insert
  with check (public.est_membre(espace_id) and cree_par = auth.uid());

create policy "invitations_suppression" on public.invitations for delete
  using (public.est_membre(espace_id));

-- ---------------------------------------------------------------------------
-- RPC appelées depuis l'application
-- ---------------------------------------------------------------------------

create or replace function public.creer_espace(p_nom text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nouvel_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  insert into public.espaces (nom, cree_par)
  values (trim(p_nom), auth.uid())
  returning id into nouvel_id;

  insert into public.membres_espace (espace_id, user_id, role)
  values (nouvel_id, auth.uid(), 'admin');

  return nouvel_id;
end;
$$;

-- Permet d'afficher « Rejoindre l'espace X ? » avant d'accepter
create or replace function public.apercu_invitation(p_code text)
returns table (espace_id uuid, nom text, deja_membre boolean)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.nom, public.est_membre(e.id)
  from public.invitations i
  join public.espaces e on e.id = i.espace_id
  where i.code = p_code and i.expire_le > now();
$$;

create or replace function public.rejoindre_espace(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cible uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  select i.espace_id into cible
  from public.invitations i
  where i.code = p_code and i.expire_le > now();

  if cible is null then
    raise exception 'Invitation invalide ou expirée';
  end if;

  insert into public.membres_espace (espace_id, user_id)
  values (cible, auth.uid())
  on conflict do nothing;

  return cible;
end;
$$;

revoke execute on function public.creer_espace(text) from public, anon;
revoke execute on function public.apercu_invitation(text) from public, anon;
revoke execute on function public.rejoindre_espace(text) from public, anon;
grant execute on function public.creer_espace(text) to authenticated;
grant execute on function public.apercu_invitation(text) to authenticated;
grant execute on function public.rejoindre_espace(text) to authenticated;
