-- Courses : le stock des produits de la maison (il en reste / presque fini /
-- fini) alimente automatiquement la liste de courses, complétée par des
-- articles ponctuels. En magasin, on met dans le panier puis on termine :
-- les produits achetés repassent à « il en reste ».

create table public.produits (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 1 and 80),
  -- Identifiant de rayon (voir src/features/courses/rayons.js)
  rayon text not null default 'autre',
  etat text not null default 'ok' check (etat in ('ok', 'bientot', 'fini')),
  dans_panier boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index produits_espace_id_idx on public.produits (espace_id);

-- Articles ponctuels de la liste (hors stock habituel), supprimés une fois achetés
create table public.articles_courses (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 1 and 80),
  rayon text not null default 'autre',
  dans_panier boolean not null default false,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index articles_courses_espace_id_idx on public.articles_courses (espace_id);

-- ---------------------------------------------------------------------------
-- Catalogue de départ, ajouté à chaque espace (modifiable ensuite)
-- ---------------------------------------------------------------------------

create or replace function public.creer_produits_par_defaut(p_espace_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.produits (espace_id, nom, rayon)
  select p_espace_id, p.nom, p.rayon
  from (values
    ('Pommes', 'fruits-legumes'), ('Bananes', 'fruits-legumes'), ('Citrons', 'fruits-legumes'),
    ('Tomates', 'fruits-legumes'), ('Salade', 'fruits-legumes'), ('Oignons', 'fruits-legumes'),
    ('Ail', 'fruits-legumes'), ('Pommes de terre', 'fruits-legumes'),
    ('Lait', 'frais'), ('Beurre', 'frais'), ('Œufs', 'frais'), ('Yaourts', 'frais'),
    ('Fromage', 'frais'), ('Crème fraîche', 'frais'), ('Jambon', 'frais'),
    ('Pain', 'boulangerie'),
    ('Pâtes', 'epicerie'), ('Riz', 'epicerie'), ('Farine', 'epicerie'), ('Sucre', 'epicerie'),
    ('Huile d''olive', 'epicerie'), ('Sel', 'epicerie'), ('Poivre', 'epicerie'),
    ('Café', 'epicerie'), ('Thé', 'epicerie'), ('Céréales', 'epicerie'),
    ('Tomates concassées', 'epicerie'),
    ('Légumes surgelés', 'surgeles'),
    ('Eau', 'boissons'), ('Jus de fruits', 'boissons'),
    ('Papier toilette', 'hygiene'), ('Dentifrice', 'hygiene'), ('Gel douche', 'hygiene'),
    ('Shampoing', 'hygiene'),
    ('Liquide vaisselle', 'entretien'), ('Lessive', 'entretien'), ('Éponges', 'entretien'),
    ('Sacs poubelle', 'entretien'), ('Essuie-tout', 'entretien')
  ) as p (nom, rayon);
$$;

revoke execute on function public.creer_produits_par_defaut(uuid) from public, anon, authenticated;

create or replace function public.produits_nouvel_espace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.creer_produits_par_defaut(new.id);
  return new;
end;
$$;

create trigger espaces_produits_par_defaut
  after insert on public.espaces
  for each row execute function public.produits_nouvel_espace();

-- Espaces créés avant cette migration
select public.creer_produits_par_defaut(e.id)
from public.espaces e
where not exists (select 1 from public.produits p where p.espace_id = e.id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.produits enable row level security;
alter table public.articles_courses enable row level security;

create policy "produits_membres" on public.produits for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "articles_courses_membres" on public.articles_courses for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Temps réel : la liste se met à jour chez l'autre pendant les courses
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.produits, public.articles_courses;
  end if;
end;
$$;
