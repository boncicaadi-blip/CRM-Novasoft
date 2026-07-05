-- ============================================================================
-- Numar de angajati, pe luna - aceeasi structura ca target_comercial_anual
-- (an + luna, nu un singur numar), ca sa avem numarul mediu de angajati
-- corect calculat pentru productivitate si cost per angajat, inclusiv
-- retroactiv pe istoric.
-- ============================================================================

create table if not exists public.angajati_lunar (
  an integer not null,
  luna integer not null check (luna between 1 and 12),
  nr_angajati integer not null default 0 check (nr_angajati >= 0),
  actualizat_la timestamptz not null default now(),
  primary key (an, luna)
);

comment on table public.angajati_lunar is 'Numar de angajati per luna - folosit pentru productivitate (Venit/Angajat) si cost per angajat (Cheltuieli/Angajat) in Management.';

alter table public.angajati_lunar enable row level security;

drop policy if exists "angajati_lunar_read" on public.angajati_lunar;
create policy "angajati_lunar_read" on public.angajati_lunar
  for select using (auth.uid() is not null);

drop policy if exists "angajati_lunar_write" on public.angajati_lunar;
create policy "angajati_lunar_write" on public.angajati_lunar
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
