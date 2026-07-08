-- ============================================================================
-- Fix de securitate, gasit la code review:
--
-- 1. Oportunitatile (CRM) foloseau o politica "orice user autentificat"
--    (opportunities_all_authenticated), fara sa verifice deloc module_access.
--    Un user cu drepturi DOAR pe Financiar putea, la nivel de baza de date,
--    citi/scrie/sterge orice oportunitate - pagina era protejata corect, dar
--    baza de date nu. O aliniem la acelasi tipar ca celelalte module: citire
--    si scriere conditionate de has_module_access('crm').
--
-- 2. Nomenclatoarele aveau aceeasi problema - orice user autentificat putea
--    crea/edita/sterge valori (Stage, Status, Produs etc), fara nicio
--    verificare de rol. Nomenclatoarele sunt citite din mai multe module
--    (CRM si Financiar), deci CITIREA ramane larga (orice user autentificat -
--    altfel s-ar rupe dropdown-urile din formulare). SCRIEREA insa devine
--    strict admin - se potriveste cu faptul ca pagina de Setari->Nomenclatoare
--    e oricum vizibila doar adminilor in meniu.
-- ============================================================================

drop policy if exists "opportunities_all_authenticated" on public.opportunities;
create policy "opportunities_module_access" on public.opportunities
  for all using (public.has_module_access('crm'))
  with check (public.has_module_access('crm'));

drop policy if exists "nomenclatoare_all_authenticated" on public.nomenclatoare;

create policy "nomenclatoare_read" on public.nomenclatoare
  for select using (auth.uid() is not null);

create policy "nomenclatoare_write" on public.nomenclatoare
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "nomenclatoare_update" on public.nomenclatoare
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "nomenclatoare_delete" on public.nomenclatoare
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
