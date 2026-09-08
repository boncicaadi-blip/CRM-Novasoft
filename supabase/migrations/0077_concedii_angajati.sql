-- Modul Concedii - Etapa 1: registru angajati + baza pentru cereri de
-- concediu (folosita acum doar de admin, pentru a popula calendarul comun;
-- fluxul de auto-cerere/aprobare de catre angajati vine in Etapa 2, pe
-- aceeasi structura de date).

create table if not exists public.angajati (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  functie text,
  departament text,
  data_angajare date,
  data_incetare date,
  activ boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  manager_id uuid references public.angajati(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.angajati is
  'Registrul de angajati - nume, functie, departament, perioada contractuala. Pastreaza istoric (activ=false) chiar si dupa incetarea contractului.';
comment on column public.angajati.user_id is
  'Legatura cu contul de autentificare din auth.users, daca angajatul are acces in CRM (ex. pentru modulul Concedii). Null daca nu are inca cont.';
comment on column public.angajati.manager_id is
  'Angajatul care ii aproba cererile de concediu (auto-referinta catre alt rand din angajati).';

create index if not exists angajati_manager_id_idx on public.angajati(manager_id);
create index if not exists angajati_user_id_idx on public.angajati(user_id);

alter table public.angajati enable row level security;

create policy "angajati_select_all_authenticated" on public.angajati
  for select using (auth.role() = 'authenticated');

create policy "angajati_admin_all" on public.angajati
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================================

create table if not exists public.concedii_cereri (
  id uuid primary key default gen_random_uuid(),
  angajat_id uuid not null references public.angajati(id) on delete cascade,
  tip text not null default 'concediu_odihna', -- 'concediu_odihna' | 'medical' | 'eveniment_special'
  data_inceput date not null,
  data_sfarsit date not null,
  nr_zile numeric(5, 1) not null,
  status text not null default 'aprobat', -- 'in_asteptare' | 'aprobat' | 'respins' (Etapa 1: totul intra direct ca 'aprobat', introdus de admin)
  observatii text,
  aprobat_de uuid references public.angajati(id) on delete set null,
  data_aprobare timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.concedii_cereri is
  'Cereri de concediu (odihna/medical/eveniment special) - baza pentru calendarul comun si, ulterior, pentru fluxul de aprobare.';

create index if not exists concedii_cereri_angajat_id_idx on public.concedii_cereri(angajat_id);
create index if not exists concedii_cereri_data_idx on public.concedii_cereri(data_inceput, data_sfarsit);

alter table public.concedii_cereri enable row level security;

create policy "concedii_cereri_select_all_authenticated" on public.concedii_cereri
  for select using (auth.role() = 'authenticated');

create policy "concedii_cereri_admin_all" on public.concedii_cereri
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================================

create table if not exists public.concedii_sold (
  id uuid primary key default gen_random_uuid(),
  angajat_id uuid not null references public.angajati(id) on delete cascade,
  an integer not null,
  zile_alocate numeric(5, 1) not null default 21,
  unique (angajat_id, an)
);

comment on table public.concedii_sold is
  'Zilele de concediu alocate per angajat, per an. Zilele folosite se calculeaza din concedii_cereri (tip=concediu_odihna, status=aprobat), nu se stocheaza separat.';

alter table public.concedii_sold enable row level security;

create policy "concedii_sold_select_all_authenticated" on public.concedii_sold
  for select using (auth.role() = 'authenticated');

create policy "concedii_sold_admin_all" on public.concedii_sold
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
