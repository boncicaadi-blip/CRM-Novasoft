-- Politica initiala de RLS pe concedii_cereri permitea scriere DOAR
-- adminilor - un angajat obisnuit (viewer/editor) nu putea nici macar sa
-- isi trimita propria cerere, desi codul din actiuni verifica deja corect
-- cine poate face ce. RLS bloca la nivel de baza de date, inainte sa
-- ajunga acolo. Inlocuim politica unica "for all" cu politici separate,
-- mai precise, pentru fiecare operatie.

drop policy if exists "concedii_cereri_admin_all" on public.concedii_cereri;

-- INSERT: oricine poate crea o cerere pentru propriul angajat (self-service),
-- iar admin/editor pot crea pentru oricine (introducere directa).
create policy "concedii_cereri_insert" on public.concedii_cereri
  for insert
  with check (
    exists (
      select 1 from public.angajati a
      where a.id = angajat_id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

-- UPDATE: solicitantul isi poate edita propria cerere (retrimitere),
-- managerul direct poate raspunde (aproba/respinge) cererile subalternilor,
-- iar admin/editor pot edita orice.
create policy "concedii_cereri_update" on public.concedii_cereri
  for update
  using (
    exists (
      select 1 from public.angajati a
      where a.id = angajat_id and a.user_id = auth.uid()
    )
    or exists (
      select 1 from public.angajati solicitant
      join public.angajati manager on manager.id = solicitant.manager_id
      where solicitant.id = angajat_id and manager.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

-- DELETE: doar admin/editor (stergerea directa din calendar).
create policy "concedii_cereri_delete" on public.concedii_cereri
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'editor')
    )
  );

-- Acelasi principiu si pentru angajati/concedii_sold - "editor" trebuie sa
-- poata edita, nu doar "admin" (politica initiala verifica doar admin).
drop policy if exists "angajati_admin_all" on public.angajati;
create policy "angajati_admin_editor_all" on public.angajati
  for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );

drop policy if exists "concedii_sold_admin_all" on public.concedii_sold;
create policy "concedii_sold_admin_editor_all" on public.concedii_sold
  for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );
