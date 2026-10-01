-- Budgets mensuels par poste (courses, restaurants…) et alerte quand une
-- dépense fait atteindre 80 % du budget ou le dépasse : les autres membres
-- reçoivent une notification (journal de la migration 0011), l'appli
-- affiche l'alerte dans Finances et sur Aujourd'hui.

create table public.budgets (
  espace_id uuid not null references public.espaces (id) on delete cascade,
  categorie text not null
    check (categorie in ('courses', 'restaurant', 'activites', 'maison', 'transport', 'sante', 'abonnements', 'vacances', 'cadeaux', 'autre')),
  montant_centimes integer not null check (montant_centimes between 1 and 99999999),
  updated_at timestamptz not null default now(),
  primary key (espace_id, categorie)
);

alter table public.budgets enable row level security;

grant select, insert, update, delete on public.budgets to authenticated;

create policy "budgets_membres" on public.budgets for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- ---------------------------------------------------------------------------
-- Alerte : seuil franchi par une dépense du mois en cours
-- ---------------------------------------------------------------------------

alter table public.evenements drop constraint if exists evenements_type_check;
alter table public.evenements add constraint evenements_type_check
  check (type in ('ajout_liste', 'courses_faites', 'charge_prise', 'diner', 'ajout_liste_partagee', 'commande_drive', 'budget'));

-- « 312,50 € »
create or replace function public.euros(p_centimes bigint)
returns text
language sql
immutable
as $$
  select replace(to_char(p_centimes / 100.0, 'FM999999990.00'), '.', ',') || ' €';
$$;

-- Libellés « Restaurants : budget dépassé (312,00 € / 300,00 €) » ou
-- « Restaurants : 85 % du budget (255,00 € / 300,00 €) »
create or replace function public.evenement_budget()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mois date := date_trunc('month', new.jour)::date;
  v_budget integer;
  v_total bigint;
  v_avant bigint;
  v_poste text;
begin
  -- Seulement le mois en cours : corriger un vieux mois ne réveille personne
  if v_mois <> date_trunc('month', current_date)::date then
    return null;
  end if;
  select montant_centimes into v_budget
  from public.budgets where espace_id = new.espace_id and categorie = new.categorie;
  if v_budget is null then
    return null;
  end if;

  select coalesce(sum(montant_centimes), 0) into v_total
  from public.depenses
  where espace_id = new.espace_id and categorie = new.categorie
    and jour >= v_mois and jour < (v_mois + interval '1 month');

  -- Total avant cette dépense (ou avant sa modification)
  v_avant := v_total - new.montant_centimes;
  if tg_op = 'UPDATE' and old.categorie = new.categorie and date_trunc('month', old.jour) = date_trunc('month', new.jour) then
    v_avant := v_avant + old.montant_centimes;
  end if;

  v_poste := case new.categorie
    when 'courses' then 'Courses' when 'restaurant' then 'Restaurants' when 'activites' then 'Activités et sorties'
    when 'maison' then 'Maison' when 'transport' then 'Transport' when 'sante' then 'Santé'
    when 'abonnements' then 'Abonnements' when 'vacances' then 'Vacances' when 'cadeaux' then 'Cadeaux'
    else 'Autre' end;

  if v_total > v_budget and v_avant <= v_budget then
    perform public.noter_evenement(new.espace_id, 'budget',
      v_poste || ' : budget dépassé (' || public.euros(v_total) || ' / ' || public.euros(v_budget) || ')');
  elsif v_total * 100 >= v_budget * 80 and v_avant * 100 < v_budget * 80 and v_total <= v_budget then
    perform public.noter_evenement(new.espace_id, 'budget',
      v_poste || ' : ' || (v_total * 100 / v_budget) || ' % du budget (' || public.euros(v_total) || ' / ' || public.euros(v_budget) || ')');
  end if;
  return null;
end;
$$;

create trigger evenement_budget
  after insert or update of montant_centimes, categorie, jour on public.depenses
  for each row execute function public.evenement_budget();

-- Temps réel : un budget changé par l'autre apparaît tout de suite
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.budgets;
  end if;
end;
$$;
