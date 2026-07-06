-- ============================================================================
-- Modulul "Management" e acum un drept de acces separat (nu mai e legat de
-- "Venituri & Cheltuieli"). Raportul de Management CITESTE date din Venituri
-- si Cheltuieli, deci userii cu doar modulul Management (fara Financiar)
-- trebuie sa poata CITI aceste tabele, dar nu sa le editeze.
--
-- Separam politica "for all" in doua: SELECT (Financiar SAU Management) si
-- scriere (doar Financiar).
-- ============================================================================

drop policy if exists "contracte_module_access" on public.contracte;
create policy "contracte_select" on public.contracte
  for select using (public.has_module_access('venituri_cheltuieli') or public.has_module_access('management'));
create policy "contracte_write" on public.contracte
  for insert with check (public.has_module_access('venituri_cheltuieli'));
create policy "contracte_update" on public.contracte
  for update using (public.has_module_access('venituri_cheltuieli')) with check (public.has_module_access('venituri_cheltuieli'));
create policy "contracte_delete" on public.contracte
  for delete using (public.has_module_access('venituri_cheltuieli'));

drop policy if exists "venituri_linii_module_access" on public.venituri_linii;
create policy "venituri_linii_select" on public.venituri_linii
  for select using (public.has_module_access('venituri_cheltuieli') or public.has_module_access('management'));
create policy "venituri_linii_write" on public.venituri_linii
  for insert with check (public.has_module_access('venituri_cheltuieli'));
create policy "venituri_linii_update" on public.venituri_linii
  for update using (public.has_module_access('venituri_cheltuieli')) with check (public.has_module_access('venituri_cheltuieli'));
create policy "venituri_linii_delete" on public.venituri_linii
  for delete using (public.has_module_access('venituri_cheltuieli'));

drop policy if exists "contracte_cheltuieli_module_access" on public.contracte_cheltuieli;
create policy "contracte_cheltuieli_select" on public.contracte_cheltuieli
  for select using (public.has_module_access('venituri_cheltuieli') or public.has_module_access('management'));
create policy "contracte_cheltuieli_write" on public.contracte_cheltuieli
  for insert with check (public.has_module_access('venituri_cheltuieli'));
create policy "contracte_cheltuieli_update" on public.contracte_cheltuieli
  for update using (public.has_module_access('venituri_cheltuieli')) with check (public.has_module_access('venituri_cheltuieli'));
create policy "contracte_cheltuieli_delete" on public.contracte_cheltuieli
  for delete using (public.has_module_access('venituri_cheltuieli'));

drop policy if exists "cheltuieli_linii_module_access" on public.cheltuieli_linii;
create policy "cheltuieli_linii_select" on public.cheltuieli_linii
  for select using (public.has_module_access('venituri_cheltuieli') or public.has_module_access('management'));
create policy "cheltuieli_linii_write" on public.cheltuieli_linii
  for insert with check (public.has_module_access('venituri_cheltuieli'));
create policy "cheltuieli_linii_update" on public.cheltuieli_linii
  for update using (public.has_module_access('venituri_cheltuieli')) with check (public.has_module_access('venituri_cheltuieli'));
create policy "cheltuieli_linii_delete" on public.cheltuieli_linii
  for delete using (public.has_module_access('venituri_cheltuieli'));

-- Angajati - citit si de Management; scrierea ramane restrictionata la admin
-- prin politica existenta angajati_lunar_write (neschimbata aici).
drop policy if exists "angajati_lunar_read" on public.angajati_lunar;
create policy "angajati_lunar_read" on public.angajati_lunar
  for select using (
    auth.uid() is not null
    and (public.has_module_access('venituri_cheltuieli') or public.has_module_access('management'))
  );
