-- Charge mentale : chaque mois, chaque membre choisit les charges du foyer
-- dont il est responsable (« owner »). Une charge n'a qu'un seul owner par
-- mois ; chaque charge a un poids (1 léger, 2 moyen, 3 lourd) pour visualiser
-- l'équilibre de la répartition.

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 1 and 80),
  emoji text not null default '📌',
  poids smallint not null default 1 check (poids between 1 and 3),
  ordre int not null default 0,
  -- Archivée : n'apparaît plus dans les nouveaux mois, reste dans l'historique
  archivee boolean not null default false,
  created_at timestamptz not null default now()
);

create index charges_espace_id_idx on public.charges (espace_id);

create table public.attributions (
  charge_id uuid not null references public.charges (id) on delete cascade,
  -- Premier jour du mois concerné
  mois date not null check (extract(day from mois) = 1),
  espace_id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  -- Un seul owner par charge et par mois : si deux membres prennent la même
  -- charge en même temps, le second reçoit une erreur de doublon
  primary key (charge_id, mois),
  -- Quitter l'espace libère ses charges
  foreign key (espace_id, user_id) references public.membres_espace (espace_id, user_id) on delete cascade
);

create index attributions_espace_mois_idx on public.attributions (espace_id, mois);

-- La charge et l'attribution doivent appartenir au même espace (sinon un
-- membre pourrait rattacher une charge d'un autre espace à son espace)
create or replace function public.verifier_attribution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.charges c where c.id = new.charge_id and c.espace_id = new.espace_id
  ) then
    raise exception 'Charge inconnue dans cet espace';
  end if;
  return new;
end;
$$;

create trigger attributions_meme_espace
  before insert or update on public.attributions
  for each row execute function public.verifier_attribution();

-- ---------------------------------------------------------------------------
-- Charges proposées par défaut à la création d'un espace
-- ---------------------------------------------------------------------------

create or replace function public.creer_charges_par_defaut(p_espace_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.charges (espace_id, nom, emoji, poids, ordre)
  values
    (p_espace_id, 'Faire la liste des courses', '📝', 1, 1),
    (p_espace_id, 'Aller faire les courses', '🛒', 2, 2),
    (p_espace_id, 'Faire le menu de la semaine', '🍽️', 2, 3),
    (p_espace_id, 'Faire la lessive', '🧺', 2, 4),
    (p_espace_id, 'Gérer les finances', '💶', 3, 5),
    (p_espace_id, 'Gérer la femme de ménage', '🧹', 1, 6),
    (p_espace_id, 'Trouver les activités à faire', '🎈', 1, 7),
    (p_espace_id, 'Prévoir les séances de sport', '🏃', 1, 8);
$$;

revoke execute on function public.creer_charges_par_defaut(uuid) from public, anon, authenticated;

create or replace function public.charges_nouvel_espace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.creer_charges_par_defaut(new.id);
  return new;
end;
$$;

create trigger espaces_charges_par_defaut
  after insert on public.espaces
  for each row execute function public.charges_nouvel_espace();

-- Espaces créés avant cette migration
select public.creer_charges_par_defaut(e.id)
from public.espaces e
where not exists (select 1 from public.charges c where c.espace_id = e.id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.charges enable row level security;
alter table public.attributions enable row level security;

create policy "charges_membres" on public.charges for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "attributions_lecture" on public.attributions for select
  using (public.est_membre(espace_id));

-- Chacun ne prend une charge que pour lui-même
create policy "attributions_prise" on public.attributions for insert
  with check (user_id = auth.uid() and public.est_membre(espace_id));

-- On relâche ses propres charges ; un admin peut libérer n'importe laquelle
create policy "attributions_relache" on public.attributions for delete
  using (user_id = auth.uid() or public.est_admin(espace_id));

-- Temps réel : quand l'autre prend une charge, l'écran se met à jour.
-- La publication n'existe que sur Supabase (pas sur un Postgres nu).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.attributions;
  end if;
end;
$$;
