-- ============================================================================
-- Extinde rolurile de la (admin, user) la (admin, editor, viewer).
--
-- 'user' devine 'editor' - comportament identic cu ce exista deja (poate
-- edita CRM: Pipeline/Actiuni/Calendar/Oferte, ramane blocat din modulele
-- admin-only: Financiar, Credit Control, Nomenclatoare, Utilizatori).
--
-- 'viewer' e nou: acces de CITIRE la modulele pe care le are (la fel ca
-- pana acum, prin module_access/submodule_access), dar NU poate scrie
-- nicaieri - nici macar in CRM. Aplicat la nivel de RLS (baza de date), nu
-- doar in cod - nu poate fi ocolit dintr-un buton ramas activ din greseala.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'editor' where role = 'user';

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'editor', 'viewer'));

alter table public.profiles alter column role set default 'editor';

comment on column public.profiles.role is
  'admin = acces total; editor = poate edita CRM, ramane blocat din modulele admin-only (Financiar/Creante/Obligatii/Nomenclatoare/Utilizatori); viewer = doar vizualizare, nicaieri nu poate scrie.';

create or replace function public.can_edit()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  );
$$;

comment on function public.can_edit is 'True daca userul curent e admin sau editor (poate scrie date). False pentru viewer.';

-- ----------------------------------------------------------------------------
-- Oportunitati (CRM): citirea ramane conditionata doar de module_access (ca
-- pana acum); scrierea (insert/update/delete) cere acum si can_edit().
-- ----------------------------------------------------------------------------

drop policy if exists "opportunities_module_access" on public.opportunities;

create policy "opportunities_select" on public.opportunities
  for select using (public.has_module_access('crm'));

create policy "opportunities_insert" on public.opportunities
  for insert with check (public.has_module_access('crm') and public.can_edit());

create policy "opportunities_update" on public.opportunities
  for update using (public.has_module_access('crm') and public.can_edit())
  with check (public.has_module_access('crm') and public.can_edit());

create policy "opportunities_delete" on public.opportunities
  for delete using (public.has_module_access('crm') and public.can_edit());

-- ----------------------------------------------------------------------------
-- Timeline oportunitati: citirea ramane deschisa, scrierea cere can_edit().
-- ----------------------------------------------------------------------------

drop policy if exists "timeline_insert_authenticated" on public.opportunity_timeline;
create policy "timeline_insert_can_edit" on public.opportunity_timeline
  for insert with check (auth.role() = 'authenticated' and public.can_edit());

-- ----------------------------------------------------------------------------
-- Oferte atasate (PDF): citirea ramane deschisa, insert/delete cer can_edit()
-- - atat pe tabelul de metadate, cat si pe bucket-ul de storage.
-- ----------------------------------------------------------------------------

drop policy if exists "opportunity_oferte_insert" on public.opportunity_oferte;
create policy "opportunity_oferte_insert" on public.opportunity_oferte
  for insert with check (auth.role() = 'authenticated' and public.can_edit());

drop policy if exists "opportunity_oferte_delete" on public.opportunity_oferte;
create policy "opportunity_oferte_delete" on public.opportunity_oferte
  for delete using (auth.role() = 'authenticated' and public.can_edit());

drop policy if exists "oferte_insert_authenticated" on storage.objects;
create policy "oferte_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'oferte' and auth.role() = 'authenticated' and public.can_edit());

drop policy if exists "oferte_delete_authenticated" on storage.objects;
create policy "oferte_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'oferte' and auth.role() = 'authenticated' and public.can_edit());
