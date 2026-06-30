-- ============================================================================
-- Preferinta de tema (light/dark/system) per utilizator, editabila din
-- pagina de Profil.
-- ============================================================================

alter table public.profiles
  add column if not exists theme text not null default 'dark'
    check (theme in ('light', 'dark', 'system'));

comment on column public.profiles.theme is 'Preferinta de tema UI: light, dark, sau system (urmeaza setarea OS-ului).';
