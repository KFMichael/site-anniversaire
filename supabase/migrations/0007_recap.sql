-- Récap par email : préférences de chaque membre et journal des envois.
-- Les emails partent de la fonction Vercel api/recap.js (tâche planifiée
-- quotidienne), qui lit les données avec la clé service_role.

create table public.preferences_notifications (
  user_id uuid primary key references public.profils (id) on delete cascade,
  -- Le dimanche : charges du mois, dîners et courses de la semaine à venir
  recap_hebdo boolean not null default true,
  -- Le 1er du mois : choisir sa charge mentale
  rappel_mensuel boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Un envoi par personne, espace, type et période : si la tâche planifiée
-- est relancée, rien n'est envoyé deux fois
create table public.envois_recap (
  user_id uuid not null references public.profils (id) on delete cascade,
  espace_id uuid not null references public.espaces (id) on delete cascade,
  -- 'hebdo' | 'mensuel' | 'apercu'
  type text not null,
  -- Semaine ('2026-09-28'), mois ('2026-10') ou horodatage d'aperçu
  periode text not null,
  envoye_le timestamptz not null default now(),
  primary key (user_id, espace_id, type, periode)
);

alter table public.preferences_notifications enable row level security;
alter table public.envois_recap enable row level security;

-- Chacun gère ses propres préférences ; sans ligne, tout est activé
create policy "preferences_notifications_perso" on public.preferences_notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Journal : lecture de ses propres envois ; l'écriture se fait côté serveur
-- (clé service_role, qui ignore la RLS)
create policy "envois_recap_lecture" on public.envois_recap for select
  using (user_id = auth.uid());
