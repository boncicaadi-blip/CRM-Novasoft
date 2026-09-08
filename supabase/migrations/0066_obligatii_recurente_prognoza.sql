-- ============================================================================
-- Plati recurente si prognoze pe Obligatii.
--
-- Doua tipuri de recurenta, acelasi mecanism:
--   'non_factura' - salarii, taxe salariale, TVA, impozit - nu sunt facturi
--                   reale, doar plati care se repeta lunar la o data fixa.
--   'furnizor'    - facturi care se stie ca vor veni lunar de la un anumit
--                   furnizor (partner_id) - genereaza "prognoze" (facturi
--                   estimate), care se inlocuiesc automat cu factura reala
--                   cand vine prin SPV (acelasi partener, aceeasi luna).
--
-- Randurile generate ajung direct in tabelul obligatii (nu unul separat),
-- marcate cu sursa='prognoza' - se comporta identic cu o factura normala
-- (poate fi platita, editata etc.), doar ca se poate filtra separat si se
-- inlocuieste automat la potrivire cu o factura reala din SPV.
-- ============================================================================

create table if not exists public.obligatii_recurente (
  id uuid primary key default gen_random_uuid(),
  tip text not null check (tip in ('non_factura', 'furnizor')),
  nume text not null,
  partner_id uuid references public.partners(id) on delete set null,
  cif_furnizor text,
  valoare numeric(12, 2) not null check (valoare > 0),
  ziua_lunii smallint not null check (ziua_lunii between 1 and 28),
  data_inceput date not null,
  data_sfarsit date,
  serviciu_facturat text,
  tip_achizitie text check (tip_achizitie is null or tip_achizitie in ('Recurente', 'Nerecurente')),
  modalitate_plata text,
  activ boolean not null default true,
  creat_la timestamptz not null default now(),
  creat_de uuid references public.profiles(id)
);

comment on table public.obligatii_recurente is
  'Reguli de plati recurente (salarii/taxe) sau facturi de la furnizori recurenti - genereaza randuri in obligatii, marcate sursa=prognoza.';

alter table public.obligatii_recurente enable row level security;

drop policy if exists "obligatii_recurente_module_access" on public.obligatii_recurente;
create policy "obligatii_recurente_module_access" on public.obligatii_recurente
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

-- ----------------------------------------------------------------------------

alter table public.obligatii add column if not exists sursa text not null default 'manual'
  check (sursa in ('manual', 'import_excel', 'anaf', 'prognoza'));
alter table public.obligatii add column if not exists obligatie_recurenta_id uuid references public.obligatii_recurente(id) on delete set null;

comment on column public.obligatii.sursa is
  'De unde a aparut randul - manual/import_excel/anaf (factura reala) sau prognoza (generata in avans dintr-o regula recurenta, inlocuita automat cand vine factura reala din SPV).';

create index if not exists obligatii_sursa_idx on public.obligatii (sursa);
create index if not exists obligatii_recurenta_id_idx on public.obligatii (obligatie_recurenta_id);

-- Randurile existente, importate deja din Excel/manual, raman 'manual' (deja e default-ul).
-- Cele legate de anaf_facturi (creanta_id deja setat acolo) le marcam 'anaf' pentru claritate.
update public.obligatii o
set sursa = 'anaf'
where exists (select 1 from public.anaf_facturi af where af.obligatie_id = o.id)
  and o.sursa = 'manual';
