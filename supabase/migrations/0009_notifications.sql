-- Notifications sur le téléphone (Web Push). Chaque appareil où un membre
-- a activé les notifications a un abonnement (fourni par le navigateur) ;
-- la fonction Vercel api/recap.js y envoie les notifications planifiées.
-- Sur iPhone : iOS 16.4+ et Nido installé sur l'écran d'accueil.

create table public.abonnements_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils (id) on delete cascade default auth.uid(),
  -- Adresse du service de push du navigateur (unique par appareil)
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz not null default now()
);

create index abonnements_push_user_id_idx on public.abonnements_push (user_id);

alter table public.abonnements_push enable row level security;

-- Chacun gère les abonnements de ses propres appareils ; l'envoi se fait
-- côté serveur (clé service_role)
create policy "abonnements_push_perso" on public.abonnements_push for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Préférences : chaque type de notification se désactive séparément
alter table public.preferences_notifications
  add column if not exists push_diner boolean not null default true,
  add column if not exists push_hebdo boolean not null default true,
  add column if not exists push_mensuel boolean not null default true;

-- Enregistrement d'un appareil : l'abonnement appartient au compte connecté
-- sur l'appareil. Si un autre compte l'avait enregistré avant (changement de
-- compte sur le même téléphone), il lui est retiré.
create or replace function public.enregistrer_abonnement_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_appareil text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  insert into public.abonnements_push (user_id, endpoint, p256dh, auth, appareil)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_appareil, 40))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        appareil = excluded.appareil,
        created_at = now();
end;
$$;

revoke execute on function public.enregistrer_abonnement_push(text, text, text, text) from public, anon;
grant execute on function public.enregistrer_abonnement_push(text, text, text, text) to authenticated;
