-- ============================================================================
-- Fix: politicile RLS de pe Creante & Obligatii verificau strict role='admin',
-- ignorand complet noul sistem de drepturi pe module (module_access). Un user
-- non-admin cu acces la modulul "creante_obligatii" vedea pagina (garda de
-- pagina verifica module_access corect), dar interogarile catre baza de date
-- erau blocate de RLS, care nu stia de acest camp - de-aici bug-ul raportat
-- (Creantele pareau "neimportate" in contul lui Stefan).
--
-- Scriere (import, marcheaza incasat/platit, stergere) ramane exclusiv admin
-- - verificarea aceea e la nivel de Server Action (requireAdmin), neschimbata
-- aici. Aceasta migrare rezolva doar CITIREA (SELECT), care e ce lipsea.
-- ============================================================================

create or replace function public.has_module_access(module text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or module = any(p.module_access))
  );
$$;

comment on function public.has_module_access is 'True daca userul curent e admin, sau are modulul dat in profiles.module_access.';

-- ----------------------------------------------------------------------------

drop policy if exists "creante_admin_all" on public.creante;
create policy "creante_module_access" on public.creante
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "creante_incasari_admin_all" on public.creante_incasari;
create policy "creante_incasari_module_access" on public.creante_incasari
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "creante_import_batches_admin_all" on public.creante_import_batches;
create policy "creante_import_batches_module_access" on public.creante_import_batches
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "obligatii_admin_all" on public.obligatii;
create policy "obligatii_module_access" on public.obligatii
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "obligatii_plati_admin_all" on public.obligatii_plati;
create policy "obligatii_plati_module_access" on public.obligatii_plati
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "obligatii_import_batches_admin_all" on public.obligatii_import_batches;
create policy "obligatii_import_batches_module_access" on public.obligatii_import_batches
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));
