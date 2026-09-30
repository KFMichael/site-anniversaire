-- Commande au drive (Carrefour, Leclerc). Aucune enseigne n'ouvre d'API :
-- l'appli ouvre leur site sur chaque produit manquant et le panier se
-- remplit là-bas. On garde ici l'enseigne de l'espace, le lien de « mon
-- produit » et son prix pour chaque article, et les commandes passées
-- (annoncées aux autres membres).

-- Une enseigne pour tout l'espace, modifiable par chaque membre
create table public.drive_espace (
  espace_id uuid primary key references public.espaces (id) on delete cascade,
  enseigne text not null check (enseigne in ('carrefour', 'leclerc')),
  -- Leclerc : adresse de base du drive du magasin
  -- (https://fd9-courses.leclercdrive.fr/magasin-137701-Torcy/)
  magasin_url text check (magasin_url is null or (magasin_url ~ '^https://' and char_length(magasin_url) <= 200)),
  updated_at timestamptz not null default now()
);

-- « Mon produit » chez une enseigne : lien de la fiche et prix constaté.
-- Retrouvé par le nom de l'article (cle = nom sans accents ni majuscules)
create table public.references_drive (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  enseigne text not null check (enseigne in ('carrefour', 'leclerc')),
  cle text not null check (char_length(cle) between 1 and 80),
  url text check (url is null or (url ~ '^https://' and char_length(url) <= 500)),
  prix_centimes integer check (prix_centimes is null or prix_centimes between 0 and 999999),
  updated_at timestamptz not null default now(),
  unique (espace_id, enseigne, cle)
);

-- Commandes passées au drive
create table public.commandes_drive (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  enseigne text not null check (enseigne in ('carrefour', 'leclerc')),
  nb_articles integer not null check (nb_articles between 1 and 999),
  montant_centimes integer check (montant_centimes is null or montant_centimes between 0 and 99999999),
  cree_par uuid not null default auth.uid() references public.profils (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index commandes_drive_espace_id_idx on public.commandes_drive (espace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.drive_espace enable row level security;
alter table public.references_drive enable row level security;
alter table public.commandes_drive enable row level security;

grant select, insert, update, delete on public.drive_espace, public.references_drive to authenticated;
grant select, insert on public.commandes_drive to authenticated;

create policy "drive_espace_membres" on public.drive_espace for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "references_drive_membres" on public.references_drive for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "commandes_drive_lecture" on public.commandes_drive for select
  using (public.est_membre(espace_id));

-- Chacun note ses propres commandes
create policy "commandes_drive_creation" on public.commandes_drive for insert
  with check (cree_par = auth.uid() and public.est_membre(espace_id));

-- ---------------------------------------------------------------------------
-- Notification aux autres membres (journal de la migration 0011)
-- ---------------------------------------------------------------------------

alter table public.evenements drop constraint if exists evenements_type_check;
alter table public.evenements add constraint evenements_type_check
  check (type in ('ajout_liste', 'courses_faites', 'charge_prise', 'diner', 'ajout_liste_partagee', 'commande_drive'));

-- Libellé « Carrefour Drive · 12 articles · 45,20 € »
create or replace function public.evenement_commande_drive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.noter_evenement(
    new.espace_id,
    'commande_drive',
    case new.enseigne when 'carrefour' then 'Carrefour Drive' else 'Leclerc Drive' end
      || ' · ' || new.nb_articles || ' article' || case when new.nb_articles > 1 then 's' else '' end
      || coalesce(' · ' || replace(to_char(new.montant_centimes / 100.0, 'FM999999990.00'), '.', ',') || ' €', '')
  );
  return null;
end;
$$;

create trigger evenement_commande_drive
  after insert on public.commandes_drive
  for each row execute function public.evenement_commande_drive();

-- Temps réel : l'enseigne et les produits mémorisés se mettent à jour chez l'autre
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.drive_espace, public.references_drive;
  end if;
end;
$$;
