-- ============================================================================
-- Modul Creante (facturi de incasat de la clienti).
--
-- Design: campurile "brute" vin din exportul lunar al aplicatiei de facturare
-- si se actualizeaza la fiecare import (upsert dupa nr_factura). Campurile de
-- "urmarire" (comportament plata, grad dificultate, data tinta de incasare,
-- observatii) sunt gestionate exclusiv din aplicatie si NU sunt niciodata
-- suprascrise de un import ulterior al aceleiasi facturi.
--
-- Acces: doar admin (Adi) - datele financiare nu sunt vizibile restului echipei.
-- ============================================================================

create table if not exists public.creante (
  id uuid primary key default gen_random_uuid(),

  -- Identificator de reconciliere la import (unic per factura).
  nr_factura text not null unique,

  -- Camp brut, actualizat la fiecare import.
  nume_firma text not null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  data_factura date,
  data_scadenta date,
  nr_contract text,
  data_contract date,
  produs text,
  serviciu_facturat text,
  termen_incasare_zile integer,
  valoare_lunara_fara_tva numeric(12, 2),
  total_fara_tva numeric(12, 2),
  total_tva numeric(12, 2),
  total_factura numeric(12, 2) not null default 0,

  -- Camp gestionat de aplicatie (seed la primul import din "Rest Incasare Fact",
  -- apoi actualizat exclusiv prin actiunea "Marcheaza incasat").
  valoare_incasata numeric(12, 2) not null default 0,
  data_incasare date,
  sold numeric(12, 2) generated always as (total_factura - valoare_incasata) stored,

  -- Camp de urmarire, editabile din aplicatie, niciodata atinse de import.
  comportament_plata text check (
    comportament_plata is null or comportament_plata in ('Bun platnic', 'Platnic mediu', 'Rau platnic')
  ),
  grad_dificultate_incasare text,
  data_tinta_incasare date,
  observatii text,
  datorie_operationala boolean not null default false,
  departament_datorie_operationala text,
  procent_penalitate_intarziere numeric(6, 4),
  valoare_penalitati_intarziere numeric(12, 2),

  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

create index if not exists creante_nume_firma_idx on public.creante (nume_firma);
create index if not exists creante_data_scadenta_idx on public.creante (data_scadenta);
create index if not exists creante_opportunity_id_idx on public.creante (opportunity_id);

comment on table public.creante is 'Facturi de incasat de la clienti - import lunar din aplicatia de facturare + urmarire manuala in CRM. Acces doar admin.';
comment on column public.creante.sold is 'Calculat automat: total_factura - valoare_incasata. NU se editeaza direct.';

-- ----------------------------------------------------------------------------

create table if not exists public.creante_import_batches (
  id uuid primary key default gen_random_uuid(),
  fisier_nume text,
  nr_facturi_noi integer not null default 0,
  nr_facturi_actualizate integer not null default 0,
  importat_de uuid references public.profiles(id),
  importat_la timestamptz not null default now()
);

comment on table public.creante_import_batches is 'Jurnal al importurilor lunare de facturi, pentru trasabilitate.';

-- ----------------------------------------------------------------------------
-- trigger: actualizeaza automat actualizat_la la orice UPDATE

create or replace function public.trg_creante_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizat_la = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.creante;
create trigger set_updated_at
  before update on public.creante
  for each row execute function public.trg_creante_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: acces exclusiv admin (nici select pentru useri non-admin).

alter table public.creante enable row level security;
alter table public.creante_import_batches enable row level security;

drop policy if exists "creante_admin_all" on public.creante;
create policy "creante_admin_all" on public.creante
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "creante_import_batches_admin_all" on public.creante_import_batches;
create policy "creante_import_batches_admin_all" on public.creante_import_batches
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
