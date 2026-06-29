-- ============================================================================
-- Permite adminilor sa editeze (UPDATE) orice profil, nu doar pe al lor.
-- Politica existenta "profiles_update_own" (din 0008) ramane pentru
-- utilizatorii normali; adaugam o politica suplimentara pentru admin.
-- ============================================================================

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
