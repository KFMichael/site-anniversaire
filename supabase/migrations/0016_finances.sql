-- Finances : les dépenses du compte commun, rangées par poste (courses,
-- restaurants, activités…), pour voir où part l'argent. Tous les membres
-- ajoutent, modifient et suppriment. Une commande au drive y ajoute son
-- montant estimé (source 'drive').

create table public.depenses (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  categorie text not null default 'autre'
    check (categorie in ('courses', 'restaurant', 'activites', 'maison', 'transport', 'sante', 'abonnements', 'vacances', 'cadeaux', 'autre')),
  montant_centimes integer not null check (montant_centimes between 1 and 99999999),
  libelle text check (libelle is null or char_length(libelle) <= 80),
  jour date not null default current_date,
  source text check (source is null or source in ('drive')),
  cree_par uuid default auth.uid() references public.profils (id) on delete set null,
  created_at timestamptz not null default now()
);

create index depenses_espace_jour_idx on public.depenses (espace_id, jour desc);

alter table public.depenses enable row level security;

grant select, insert, update, delete on public.depenses to authenticated;

create policy "depenses_membres" on public.depenses for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Temps réel : une dépense ajoutée par l'autre apparaît tout de suite
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.depenses;
  end if;
end;
$$;
