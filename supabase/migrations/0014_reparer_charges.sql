-- Réparation de la charge mentale : remet en place, sans rien casser, ce
-- que la migration 0004 aurait dû créer si elle s'est arrêtée en cours de
-- route (règles d'accès absentes : 0 charge visible et « 403 » à l'ajout).
-- Sans effet si tout est déjà en place : peut être exécutée plusieurs fois.

alter table public.charges enable row level security;
alter table public.attributions enable row level security;

grant select, insert, update, delete on public.charges, public.attributions to authenticated;

drop policy if exists "charges_membres" on public.charges;
create policy "charges_membres" on public.charges for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

drop policy if exists "attributions_lecture" on public.attributions;
create policy "attributions_lecture" on public.attributions for select
  using (public.est_membre(espace_id));

-- Chacun ne prend une charge que pour lui-même
drop policy if exists "attributions_prise" on public.attributions;
create policy "attributions_prise" on public.attributions for insert
  with check (user_id = auth.uid() and public.est_membre(espace_id));

-- On relâche ses propres charges ; un admin peut libérer n'importe laquelle
drop policy if exists "attributions_relache" on public.attributions;
create policy "attributions_relache" on public.attributions for delete
  using (user_id = auth.uid() or public.est_admin(espace_id));

-- Liste par défaut pour chaque nouvel espace
drop trigger if exists espaces_charges_par_defaut on public.espaces;
create trigger espaces_charges_par_defaut
  after insert on public.espaces
  for each row execute function public.charges_nouvel_espace();

-- Espaces restés sans aucune charge
select public.creer_charges_par_defaut(e.id)
from public.espaces e
where not exists (select 1 from public.charges c where c.espace_id = e.id);

-- Temps réel (Supabase uniquement)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'charges'
    ) then
      alter publication supabase_realtime add table public.charges;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attributions'
    ) then
      alter publication supabase_realtime add table public.attributions;
    end if;
  end if;
end;
$$;
