-- Échéances du foyer (impôts, assurances, taxe foncière, contrôle
-- technique…) avec rappels, et listes partagées (films à voir, choses à
-- faire…) dont un élément peut devenir une invitation d'agenda.
-- Rappels automatiques : tâche quotidienne api/recap.js. Rappel immédiat :
-- api/echeances.js. Invitations : api/invitation.js.

-- ---------------------------------------------------------------------------
-- Échéances
-- ---------------------------------------------------------------------------

create table public.echeances (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  titre text not null check (char_length(trim(titre)) between 1 and 80),
  -- Identifiant de catégorie (voir src/features/echeances/echeances.js)
  categorie text not null default 'autre',
  -- Prochaine date (avancée d'un mois ou d'un an quand une échéance
  -- récurrente est marquée faite)
  date date not null,
  recurrence text not null default 'aucune' check (recurrence in ('aucune', 'mensuelle', 'annuelle')),
  -- Jours avant l'échéance où une notification est envoyée (0 = le jour même)
  rappels smallint[] not null default '{7,1}'
    check (cardinality(rappels) <= 5 and 0 <= all (rappels) and 60 >= all (rappels)),
  -- Personne concernée ; null = tout le monde
  responsable uuid references public.profils (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  -- Échéance ponctuelle réglée (les récurrentes passent à la date suivante)
  faite_le timestamptz,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index echeances_espace_date_idx on public.echeances (espace_id, date);

alter table public.echeances enable row level security;

create policy "echeances_membres" on public.echeances for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- ---------------------------------------------------------------------------
-- Listes partagées
-- ---------------------------------------------------------------------------

create table public.listes (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 1 and 60),
  emoji text not null default '📝',
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  -- Pour la clé étrangère composée des éléments (même espace)
  unique (id, espace_id)
);

create index listes_espace_id_idx on public.listes (espace_id);

create table public.elements_liste (
  id uuid primary key default gen_random_uuid(),
  liste_id uuid not null,
  espace_id uuid not null,
  texte text not null check (char_length(trim(texte)) between 1 and 120),
  note text check (note is null or char_length(note) <= 300),
  fait boolean not null default false,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  -- Invitation d'agenda proposée à partir de l'élément (« Film samedi 20h30 »)
  invitation_debut timestamptz,
  invitation_duree smallint check (invitation_duree is null or invitation_duree between 15 and 720),
  invitation_sequence int not null default 0,
  invitation_envoyee_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- L'élément appartient à une liste du même espace
  foreign key (liste_id, espace_id) references public.listes (id, espace_id) on delete cascade
);

create index elements_liste_liste_id_idx on public.elements_liste (liste_id);

alter table public.listes enable row level security;
alter table public.elements_liste enable row level security;

create policy "listes_membres" on public.listes for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "elements_liste_membres" on public.elements_liste for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.echeances, public.listes, public.elements_liste;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Rappels d'échéances coupables par chacun
alter table public.preferences_notifications
  add column if not exists push_echeances boolean not null default true;

-- Actions des autres (migration 0011) : ajout à une liste partagée
alter table public.evenements drop constraint if exists evenements_type_check;
alter table public.evenements add constraint evenements_type_check
  check (type in ('ajout_liste', 'courses_faites', 'charge_prise', 'diner', 'ajout_liste_partagee'));

create or replace function public.evenement_element_liste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.noter_evenement(
    new.espace_id,
    'ajout_liste_partagee',
    left((select nom from public.listes where id = new.liste_id) || ' › ' || new.texte, 80)
  );
  return null;
end;
$$;

create trigger evenement_element_liste
  after insert on public.elements_liste
  for each row execute function public.evenement_element_liste();
