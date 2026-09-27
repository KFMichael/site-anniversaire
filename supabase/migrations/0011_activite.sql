-- Notifications des actions des autres membres (« Léa a ajouté lait à la
-- liste »). Des déclencheurs notent chaque action utile dans `evenements` ;
-- la fonction Vercel api/activite.js, appelée par l'appli quelques secondes
-- après une action, regroupe les événements pas encore notifiés et envoie
-- une notification push aux autres membres de l'espace.
-- Les événements sont écrits uniquement par ces déclencheurs : un membre ne
-- peut pas en fabriquer (aucune politique d'écriture).

create table public.evenements (
  id bigint generated always as identity primary key,
  espace_id uuid not null references public.espaces (id) on delete cascade,
  auteur uuid not null references public.profils (id) on delete cascade,
  -- 'ajout_liste' | 'courses_faites' | 'charge_prise' | 'diner'
  type text not null check (type in ('ajout_liste', 'courses_faites', 'charge_prise', 'diner')),
  -- Nom du produit, de la charge ou du plat
  libelle text not null check (char_length(libelle) <= 80),
  created_at timestamptz not null default now(),
  -- Pris en charge par un envoi (null = pas encore notifié)
  notifie_le timestamptz
);

create index evenements_a_notifier_idx on public.evenements (espace_id, created_at) where notifie_le is null;

alter table public.evenements enable row level security;

create policy "evenements_lecture" on public.evenements for select
  using (public.est_membre(espace_id));

-- Préférence : chaque membre peut couper ces notifications
alter table public.preferences_notifications
  add column if not exists push_activite boolean not null default true;

-- Note un événement, seulement pour une action d'un membre connecté (pas
-- pour la clé service_role ni l'éditeur SQL)
create or replace function public.noter_evenement(p_espace_id uuid, p_type text, p_libelle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_libelle is null or trim(p_libelle) = '' then
    return;
  end if;
  insert into public.evenements (espace_id, auteur, type, libelle)
  values (p_espace_id, auth.uid(), p_type, left(trim(p_libelle), 80));
end;
$$;

revoke execute on function public.noter_evenement(uuid, text, text) from public, anon, authenticated;

-- Produit du stock : passé à « presque fini » ou « fini » (ajouté à la
-- liste), ou acheté (il était dans le panier et repasse à « il en reste »)
create or replace function public.evenement_produit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.etat = 'ok' and new.etat in ('bientot', 'fini') then
    perform public.noter_evenement(new.espace_id, 'ajout_liste', new.nom);
  elsif old.etat <> 'ok' and old.dans_panier and new.etat = 'ok' then
    perform public.noter_evenement(new.espace_id, 'courses_faites', new.nom);
  end if;
  return null;
end;
$$;

create trigger evenement_produit
  after update of etat on public.produits
  for each row execute function public.evenement_produit();

-- Article ponctuel : ajouté à la liste, ou acheté (supprimé depuis le panier)
create or replace function public.evenement_article()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.noter_evenement(new.espace_id, 'ajout_liste', new.nom);
  elsif old.dans_panier then
    perform public.noter_evenement(old.espace_id, 'courses_faites', old.nom);
  end if;
  return null;
end;
$$;

create trigger evenement_article
  after insert or delete on public.articles_courses
  for each row execute function public.evenement_article();

-- Charge mentale prise pour un mois
create or replace function public.evenement_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.noter_evenement(
    new.espace_id,
    'charge_prise',
    (select nom from public.charges where id = new.charge_id)
  );
  return null;
end;
$$;

create trigger evenement_attribution
  after insert on public.attributions
  for each row execute function public.evenement_attribution();

-- Dîner prévu ou changé (un simple verrouillage ne compte pas)
create or replace function public.evenement_diner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.plat_id is not distinct from old.plat_id and new.texte is not distinct from old.texte then
    return null;
  end if;
  perform public.noter_evenement(
    new.espace_id,
    'diner',
    coalesce((select nom from public.plats where id = new.plat_id), new.texte)
  );
  return null;
end;
$$;

create trigger evenement_diner
  after insert or update on public.diners
  for each row execute function public.evenement_diner();
