-- Coffre à mots de passe partagé, chiffré de bout en bout.
--
-- Tout le chiffrement a lieu dans le navigateur (src/features/coffre/crypto.js).
-- Le coffre a une clé maîtresse aléatoire (AES-GCM 256) qui chiffre les
-- entrées. Elle n'est jamais stockée en clair, seulement « enveloppée » :
--   - par la phrase secrète de l'espace (PBKDF2) -> table coffres ;
--   - par Face ID / Touch ID sur chaque appareil activé (secret PRF d'une
--     passkey WebAuthn, qui ne quitte pas l'appareil) -> table cles_appareils.
-- La base ne contient donc que du chiffré : ni la phrase, ni la clé, ni même
-- le nom des entrées ne sont lisibles côté serveur.

create table public.coffres (
  espace_id uuid primary key references public.espaces (id) on delete cascade,
  -- Dérivation de la clé d'enveloppe depuis la phrase secrète
  sel text not null,
  iterations int not null check (iterations >= 100000),
  -- Clé maîtresse chiffrée par la clé d'enveloppe (AES-GCM : une mauvaise
  -- phrase fait échouer le déchiffrement, pas besoin de vérificateur)
  cle_iv text not null,
  cle_enveloppee text not null,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entrees_coffre (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.coffres (espace_id) on delete cascade,
  -- JSON chiffré {nom, categorie, identifiant, motDePasse, url, note}
  iv text not null,
  chiffre text not null,
  cree_par uuid references public.profils (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entrees_coffre_espace_id_idx on public.entrees_coffre (espace_id);

-- Appareils sur lesquels un membre a activé Face ID / Touch ID pour le coffre
create table public.cles_appareils (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid not null references public.coffres (espace_id) on delete cascade,
  user_id uuid not null default auth.uid(),
  -- Identifiant de la passkey (base64url) et entrée de l'extension PRF
  credential_id text not null,
  prf_sel text not null,
  -- Clé maîtresse chiffrée par la clé issue du secret PRF
  cle_iv text not null,
  cle_enveloppee text not null,
  libelle text not null default 'Appareil',
  created_at timestamptz not null default now(),
  unique (espace_id, credential_id),
  -- Quitter l'espace retire aussi ses appareils
  foreign key (espace_id, user_id) references public.membres_espace (espace_id, user_id) on delete cascade
);

create index cles_appareils_espace_user_idx on public.cles_appareils (espace_id, user_id);

alter table public.coffres enable row level security;
alter table public.entrees_coffre enable row level security;
alter table public.cles_appareils enable row level security;

create policy "coffres_lecture" on public.coffres for select
  using (public.est_membre(espace_id));

create policy "coffres_creation" on public.coffres for insert
  with check (public.est_membre(espace_id));

-- Changement de phrase secrète : seule l'enveloppe change (sel, clé enveloppée)
create policy "coffres_modification" on public.coffres for update
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Réinitialiser le coffre (phrase oubliée) efface toutes les entrées et les
-- appareils activés : réservé aux admins de l'espace
create policy "coffres_suppression" on public.coffres for delete
  using (public.est_admin(espace_id));

create policy "entrees_coffre_membres" on public.entrees_coffre for all
  using (public.est_membre(espace_id))
  with check (public.est_membre(espace_id));

-- Chacun ne voit et ne gère que ses propres appareils
create policy "cles_appareils_lecture" on public.cles_appareils for select
  using (user_id = auth.uid() and public.est_membre(espace_id));

create policy "cles_appareils_creation" on public.cles_appareils for insert
  with check (user_id = auth.uid() and public.est_membre(espace_id));

create policy "cles_appareils_suppression" on public.cles_appareils for delete
  using (user_id = auth.uid() or public.est_admin(espace_id));
