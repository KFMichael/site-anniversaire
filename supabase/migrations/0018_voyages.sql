-- Voyages de la carte (Activités › Voyages), propres à chaque espace :
-- remplacent la liste écrite dans le code (src/features/activites/data/voyages.js),
-- commune à tous les espaces. Le lieu et ses coordonnées viennent de la
-- recherche OpenStreetMap (Nominatim) faite dans le navigateur.

create table public.voyages (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  lieu text not null check (char_length(trim(lieu)) between 1 and 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  date_voyage date,
  anecdote text check (anecdote is null or char_length(anecdote) <= 500),
  cree_par uuid default auth.uid() references public.profils (id) on delete set null,
  created_at timestamptz not null default now()
);

create index voyages_espace_id_idx on public.voyages (espace_id);

alter table public.voyages enable row level security;

grant select, insert, update, delete on public.voyages to authenticated;

create policy "voyages_membres" on public.voyages for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Temps réel : un voyage ajouté par l'autre apparaît sur la carte
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.voyages;
  end if;
end;
$$;
