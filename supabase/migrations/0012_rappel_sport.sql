-- Rappel des séances de sport la veille au soir (notification envoyée par
-- la tâche quotidienne api/recap.js) : chaque membre peut le couper.

alter table public.preferences_notifications
  add column if not exists push_sport boolean not null default true;
