-- ============================================================================
-- Aprobare manuala a userilor noi de catre admin. Userul nou isi confirma
-- email-ul normal (flux Supabase Auth neschimbat), dar profilul ramane
-- "approved = false" pana cand un admin il aproba explicit din
-- /setari/utilizatori. Blocajul real se face la nivel de aplicatie
-- (app)/layout.tsx, nu la nivel de Supabase Auth.
-- ============================================================================

alter table public.profiles
  add column if not exists approved boolean not null default false;

comment on column public.profiles.approved is 'Daca e false, userul si-a confirmat emailul dar nu are inca acces la aplicatie - asteapta aprobare de la un admin.';

-- Conturile deja existente (Adrian, Stefan) sunt aprobate retroactiv -
-- regula se aplica doar userilor noi, de acum incolo.
update public.profiles set approved = true;
