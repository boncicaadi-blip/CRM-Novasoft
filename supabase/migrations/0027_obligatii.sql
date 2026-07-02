-- ============================================================================
-- Modul Obligatii (facturi de platit catre furnizori) - oglinda structurala
-- a modulului Creante. Diferenta cheie: nr_factura la furnizori poate fi
-- alfanumeric (ex: "AHR490003960", "AII nr. 2262"), nu doar numeric ca la
-- facturile Novasoft emise catre clienti - de aceea nr_factura ramane text
-- liber, fara conversie la intreg la import.
-- ============================================================================

create table if not exists public.obligatii (
  id uuid primary key default gen_random_uuid(),

  nr_factura text not null unique,
  nume_furnizor text not null,
  data_factura date,
  data_scadenta date,
  serviciu_facturat text,
  tip_achizitie text check (tip_achizitie is null or tip_achizitie in ('Recurente', 'Nerecurente')),
  modalitate_plata text,
  responsabil_achizitie text,
  total_factura numeric(12, 2) not null default 0,

  -- Gestionat de aplicatie (seed la import, apoi exclusiv prin "Marcheaza platit").
  valoare_platita numeric(12, 2) not null default 0,
  data_plata date,
  sold numeric(12, 2) generated always as (total_factura - valoare_platita) stored,

  propus_spre_plata boolean not null default false,
  observatii text,

  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

create index if not exists obligatii_nume_furnizor_idx on public.obligatii (nume_furnizor);
create index if not exists obligatii_data_scadenta_idx on public.obligatii (data_scadenta);

comment on table public.obligatii is 'Facturi de platit catre furnizori - import + urmarire manuala in CRM. Acces doar admin.';

create table if not exists public.obligatii_plati (
  id uuid primary key default gen_random_uuid(),
  obligatie_id uuid not null references public.obligatii(id) on delete cascade,
  valoare numeric(12, 2) not null check (valoare > 0),
  data_plata date not null,
  observatie text,
  creat_de uuid references public.profiles(id),
  creat_la timestamptz not null default now()
);

create index if not exists obligatii_plati_obligatie_id_idx on public.obligatii_plati (obligatie_id);

comment on table public.obligatii_plati is 'Jurnal de plati pe factura furnizor - fiecare plata (integrala sau partiala) e o intrare separata, reversibila.';

create table if not exists public.obligatii_import_batches (
  id uuid primary key default gen_random_uuid(),
  fisier_nume text,
  nr_facturi_noi integer not null default 0,
  nr_facturi_actualizate integer not null default 0,
  importat_de uuid references public.profiles(id),
  importat_la timestamptz not null default now()
);

-- ----------------------------------------------------------------------------

create or replace function public.trg_obligatii_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizat_la = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.obligatii;
create trigger set_updated_at
  before update on public.obligatii
  for each row execute function public.trg_obligatii_set_updated_at();

create or replace function public.trg_obligatii_plati_sync()
returns trigger
language plpgsql
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.obligatie_id, old.obligatie_id);

  update public.obligatii
  set
    valoare_platita = coalesce(
      (select sum(valoare) from public.obligatii_plati where obligatie_id = target_id), 0
    ),
    data_plata = (
      select max(data_plata) from public.obligatii_plati where obligatie_id = target_id
    )
  where id = target_id;

  return null;
end;
$$;

drop trigger if exists sync_valoare_platita on public.obligatii_plati;
create trigger sync_valoare_platita
  after insert or update or delete on public.obligatii_plati
  for each row execute function public.trg_obligatii_plati_sync();

-- ----------------------------------------------------------------------------
-- RLS: acces exclusiv admin, la fel ca la Creante.

alter table public.obligatii enable row level security;
alter table public.obligatii_plati enable row level security;
alter table public.obligatii_import_batches enable row level security;

drop policy if exists "obligatii_admin_all" on public.obligatii;
create policy "obligatii_admin_all" on public.obligatii
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "obligatii_plati_admin_all" on public.obligatii_plati;
create policy "obligatii_plati_admin_all" on public.obligatii_plati
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "obligatii_import_batches_admin_all" on public.obligatii_import_batches;
create policy "obligatii_import_batches_admin_all" on public.obligatii_import_batches
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
