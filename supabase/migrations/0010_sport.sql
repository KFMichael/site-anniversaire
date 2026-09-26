-- Séances de sport : la personne responsable de la charge « Prévoir les
-- séances de sport » planifie jusqu'à 3 séances de 45 min par semaine, puis
-- envoie l'invitation (email + fichier d'agenda .ics) aux autres membres.
-- L'envoi se fait côté serveur (api/sport.js).

create table public.seances_sport (
  -- Sert aussi d'UID de l'événement d'agenda : les mises à jour et les
  -- annulations remplacent le même événement dans les agendas
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  debut timestamptz not null,
  duree_minutes smallint not null default 45 check (duree_minutes between 15 and 240),
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  -- Numéro de version de l'invitation (augmenté à chaque envoi)
  sequence int not null default 0,
  -- Dernier envoi ; null = jamais envoyée. Modifiée après l'envoi : à renvoyer
  envoyee_le timestamptz,
  -- Supprimée après envoi : l'annulation part au prochain envoi
  annulee boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seances_sport_espace_debut_idx on public.seances_sport (espace_id, debut);

alter table public.seances_sport enable row level security;

create policy "seances_sport_membres" on public.seances_sport for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.seances_sport;
  end if;
end;
$$;
