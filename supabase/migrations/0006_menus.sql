-- Menus : bibliothèque de plats de l'espace, dîner de chaque jour, et règles
-- du tirage au sort (appliquées côté application, voir
-- src/features/menus/tirage.js).

create table public.plats (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.espaces (id) on delete cascade,
  nom text not null check (char_length(trim(nom)) between 1 and 80),
  -- Identifiant de catégorie (voir src/features/menus/categories.js)
  categorie text not null default 'autre',
  -- Prêt en 30 minutes environ : proposé en semaine si la règle est active
  rapide boolean not null default true,
  -- Noms d'ingrédients, rapprochés des produits du stock pour les courses
  ingredients text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index plats_espace_id_idx on public.plats (espace_id);

-- Le dîner d'un jour : un plat de la bibliothèque, ou un texte libre
-- (« Resto », « Restes »…). Verrouillé = le tirage au sort n'y touche pas.
create table public.diners (
  espace_id uuid not null references public.espaces (id) on delete cascade,
  jour date not null,
  plat_id uuid references public.plats (id) on delete set null,
  texte text check (texte is null or char_length(texte) <= 80),
  verrouille boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (espace_id, jour)
);

-- Un seul jeu de règles par espace
create table public.reglages_menus (
  espace_id uuid primary key references public.espaces (id) on delete cascade,
  pas_semaine_precedente boolean not null default true,
  -- 0 = pas de limite
  max_par_categorie smallint not null default 2 check (max_par_categorie between 0 and 7),
  rapide_en_semaine boolean not null default true
);

-- Le plat choisi doit appartenir au même espace
create or replace function public.verifier_diner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.plat_id is not null and not exists (
    select 1 from public.plats p where p.id = new.plat_id and p.espace_id = new.espace_id
  ) then
    raise exception 'Plat inconnu dans cet espace';
  end if;
  return new;
end;
$$;

create trigger diners_meme_espace
  before insert or update on public.diners
  for each row execute function public.verifier_diner();

-- ---------------------------------------------------------------------------
-- Plats de départ, ajoutés à chaque espace (modifiables ensuite). Les
-- ingrédients reprennent les noms du stock (migration 0005 et produits
-- ouest-africains ci-dessous) pour l'envoi vers la liste de courses.
-- ---------------------------------------------------------------------------

create or replace function public.creer_plats_par_defaut(p_espace_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.plats (espace_id, nom, categorie, rapide, ingredients)
  values
    (p_espace_id, 'Pâtes bolognaise', 'pates', true, '{Pâtes,Viande hachée,Tomates concassées,Oignons}'),
    (p_espace_id, 'Pâtes carbonara', 'pates', true, '{Pâtes,Lardons,Œufs,Fromage}'),
    (p_espace_id, 'Lasagnes', 'pates', false, '{Feuilles de lasagne,Viande hachée,Tomates concassées,Fromage,Lait,Beurre,Farine}'),
    (p_espace_id, 'Poulet rôti et pommes de terre', 'viande', false, '{Poulet,Pommes de terre,Ail}'),
    (p_espace_id, 'Steak haché et frites', 'viande', true, '{Steak haché,Frites surgelées,Salade}'),
    (p_espace_id, 'Chili con carne', 'viande', false, '{Viande hachée,Haricots rouges,Tomates concassées,Oignons,Riz}'),
    (p_espace_id, 'Saumon et riz', 'poisson', true, '{Saumon,Riz,Citrons}'),
    (p_espace_id, 'Poisson pané et haricots verts', 'poisson', true, '{Poisson pané,Haricots verts}'),
    (p_espace_id, 'Omelette et salade', 'oeufs', true, '{Œufs,Fromage,Salade}'),
    (p_espace_id, 'Quiche lorraine', 'oeufs', false, '{Pâte brisée,Œufs,Lardons,Crème fraîche,Lait}'),
    (p_espace_id, 'Soupe de légumes', 'soupe', false, '{Légumes surgelés,Pommes de terre,Oignons,Pain}'),
    (p_espace_id, 'Curry de légumes', 'vegetarien', false, '{Légumes surgelés,Lait de coco,Pâte de curry,Riz}'),
    (p_espace_id, 'Risotto aux champignons', 'vegetarien', false, '{Riz,Champignons,Oignons,Fromage,Beurre}'),
    (p_espace_id, 'Salade composée', 'vegetarien', true, '{Salade,Tomates,Œufs,Fromage}'),
    (p_espace_id, 'Croque-monsieur', 'autre', true, '{Pain de mie,Jambon,Fromage,Beurre,Salade}'),
    (p_espace_id, 'Pizza maison', 'autre', false, '{Pâte à pizza,Tomates concassées,Jambon,Fromage}'),
    (p_espace_id, 'Wraps poulet', 'autre', true, '{Tortillas,Poulet,Salade,Tomates}'),
    (p_espace_id, 'Crêpes', 'autre', true, '{Farine,Œufs,Lait,Jambon,Fromage}'),
    -- Cuisine ivoirienne et ouest-africaine
    (p_espace_id, 'Garba', 'poisson', true, '{Attiéké,Thon,Piment,Oignons,Tomates}'),
    (p_espace_id, 'Attiéké poisson braisé', 'poisson', true, '{Attiéké,Poisson frais,Oignons,Tomates,Piment,Cube Maggi}'),
    (p_espace_id, 'Alloco poisson', 'poisson', true, '{Banane plantain,Poisson frais,Piment,Oignons,Huile d''arachide}'),
    (p_espace_id, 'Alloco poulet braisé', 'viande', true, '{Banane plantain,Poulet,Oignons,Piment,Huile d''arachide}'),
    (p_espace_id, 'Kédjénou de poulet', 'viande', false, '{Poulet,Aubergines,Tomates,Oignons,Gingembre,Piment,Attiéké}'),
    (p_espace_id, 'Sauce graine et riz', 'sauce', false, '{Crème de palme,Viande de bœuf,Poisson fumé,Aubergines,Piment,Riz}'),
    (p_espace_id, 'Sauce arachide et riz', 'sauce', false, '{Pâte d''arachide,Poulet,Tomate concentrée,Oignons,Piment,Riz}'),
    (p_espace_id, 'Sauce gombo', 'sauce', false, '{Gombo,Viande de bœuf,Poisson fumé,Huile de palme,Soumbala,Piment,Riz}'),
    (p_espace_id, 'Sauce feuille (manioc)', 'sauce', false, '{Feuilles de manioc,Huile de palme,Viande de bœuf,Poisson fumé,Piment,Riz}'),
    (p_espace_id, 'Foutou banane sauce claire', 'sauce', false, '{Banane plantain,Manioc,Poulet,Aubergines,Tomates,Piment}'),
    (p_espace_id, 'Placali sauce kopè', 'sauce', false, '{Placali,Gombo,Poisson fumé,Huile de palme,Piment}'),
    (p_espace_id, 'Riz gras', 'viande', false, '{Riz,Viande de bœuf,Tomate concentrée,Oignons,Carottes,Chou}'),
    (p_espace_id, 'Poulet yassa', 'viande', false, '{Poulet,Oignons,Citrons,Moutarde,Riz}'),
    (p_espace_id, 'Thiéboudienne', 'poisson', false, '{Riz,Poisson frais,Tomate concentrée,Manioc,Carottes,Chou,Aubergines}'),
    (p_espace_id, 'Igname frite et poisson', 'poisson', true, '{Igname,Poisson frais,Piment,Oignons,Huile d''arachide}'),
    (p_espace_id, 'Pain omelette', 'oeufs', true, '{Pain,Œufs,Oignons,Tomates,Piment}');
$$;

-- Produits de la cuisine ivoirienne et ouest-africaine, ajoutés au stock de
-- chaque espace (le stock de départ de la migration 0005 est déjà en place)
create or replace function public.creer_produits_ouest_africains(p_espace_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.produits (espace_id, nom, rayon)
  select p_espace_id, p.nom, p.rayon
  from (values
    ('Banane plantain', 'fruits-legumes'), ('Igname', 'fruits-legumes'), ('Manioc', 'fruits-legumes'),
    ('Patate douce', 'fruits-legumes'), ('Gombo', 'fruits-legumes'), ('Aubergines', 'fruits-legumes'),
    ('Piment', 'fruits-legumes'), ('Gingembre', 'fruits-legumes'), ('Carottes', 'fruits-legumes'),
    ('Chou', 'fruits-legumes'), ('Avocats', 'fruits-legumes'), ('Mangues', 'fruits-legumes'),
    ('Ananas', 'fruits-legumes'),
    ('Placali', 'frais'),
    ('Poulet', 'boucherie'), ('Viande de bœuf', 'boucherie'), ('Poisson frais', 'boucherie'),
    ('Poisson fumé', 'boucherie'),
    ('Attiéké', 'epicerie'), ('Gari', 'epicerie'), ('Huile de palme', 'epicerie'),
    ('Huile d''arachide', 'epicerie'), ('Crème de palme', 'epicerie'), ('Pâte d''arachide', 'epicerie'),
    ('Tomate concentrée', 'epicerie'), ('Cube Maggi', 'epicerie'), ('Soumbala', 'epicerie'),
    ('Thon', 'epicerie'), ('Moutarde', 'epicerie'), ('Fleurs de bissap', 'epicerie'),
    ('Feuilles de manioc', 'surgeles')
  ) as p (nom, rayon)
  where not exists (
    select 1 from public.produits x
    where x.espace_id = p_espace_id and lower(x.nom) = lower(p.nom)
  );
$$;

revoke execute on function public.creer_produits_ouest_africains(uuid) from public, anon, authenticated;

revoke execute on function public.creer_plats_par_defaut(uuid) from public, anon, authenticated;

create or replace function public.plats_nouvel_espace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.creer_plats_par_defaut(new.id);
  perform public.creer_produits_ouest_africains(new.id);
  insert into public.reglages_menus (espace_id) values (new.id);
  return new;
end;
$$;

create trigger espaces_plats_par_defaut
  after insert on public.espaces
  for each row execute function public.plats_nouvel_espace();

-- Espaces créés avant cette migration
select public.creer_plats_par_defaut(e.id)
from public.espaces e
where not exists (select 1 from public.plats p where p.espace_id = e.id);

insert into public.reglages_menus (espace_id)
select id from public.espaces
on conflict (espace_id) do nothing;

select public.creer_produits_ouest_africains(e.id) from public.espaces e;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.plats enable row level security;
alter table public.diners enable row level security;
alter table public.reglages_menus enable row level security;

create policy "plats_membres" on public.plats for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

create policy "diners_membres" on public.diners for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Lecture et modification ; la ligne est créée avec l'espace
create policy "reglages_menus_lecture" on public.reglages_menus for select
  using (public.est_membre(espace_id));

create policy "reglages_menus_modification" on public.reglages_menus for update
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.diners;
  end if;
end;
$$;
