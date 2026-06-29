-- ============================================================================
-- Adauga rol pe profiluri (admin / user). Implicit toti userii noi sunt
-- 'user'; Adrian Boncica e promovat manual la 'admin' mai jos (singurul
-- admin pentru aceasta etapa, conform cerintei).
-- ============================================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('admin', 'user'));

comment on column public.profiles.role is 'admin = acces la lista completa de utilizatori si (in viitor) gestionare drepturi; user = acces normal la aplicatie.';

-- Promovam manual contul lui Adrian la admin. Daca emailul difera, ajusteaza
-- aici (cauta in Table Editor -> profiles pentru emailul exact).
update public.profiles set role = 'admin' where email ilike '%adrian%' or full_name ilike '%adrian%';

-- Politica suplimentara: orice utilizator autentificat poate vedea toate
-- profilurile (deja exista din 0001_init.sql), dar adaugam si update pe
-- propriul profil (pentru schimbarea parolei se foloseste auth.users prin
-- Supabase Auth API, nu tabela profiles - parola nu e stocata aici).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
