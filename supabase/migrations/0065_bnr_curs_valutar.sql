-- ============================================================================
-- Integrare curs valutar BNR - pentru facturi externe (Obligatii) in alta
-- moneda decat RON. Cursurile se cacheaza local (tabelul curs_valutar), ca sa
-- nu trimitem cereri repetate catre BNR (site-ul lor blocheaza IP-urile cu
-- trafic excesiv/repetat intr-un timp scurt).
-- ============================================================================

create table if not exists public.curs_valutar (
  data date not null,
  moneda text not null,
  curs numeric(12, 6) not null,
  creat_la timestamptz not null default now(),
  primary key (data, moneda)
);

comment on table public.curs_valutar is
  'Cache local al cursurilor BNR (curs.bnr.ro) - populat automat, o singura data per (data, moneda), la prima cerere.';

alter table public.curs_valutar enable row level security;

drop policy if exists "curs_valutar_select_authenticated" on public.curs_valutar;
create policy "curs_valutar_select_authenticated" on public.curs_valutar
  for select using (auth.role() = 'authenticated');

drop policy if exists "curs_valutar_insert_authenticated" on public.curs_valutar;
create policy "curs_valutar_insert_authenticated" on public.curs_valutar
  for insert with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Obligatii: suport pentru facturi in alta moneda decat RON. total_factura
-- (si sold-ul calculat din el) raman intotdeauna in RON - moneda/valoare_valuta/
-- curs_valutar sunt pastrate doar ca referinta a sumei originale din factura.
-- ----------------------------------------------------------------------------

alter table public.obligatii add column if not exists moneda text not null default 'RON';
alter table public.obligatii add column if not exists valoare_valuta numeric(12, 2);
alter table public.obligatii add column if not exists curs_valutar numeric(12, 6);

comment on column public.obligatii.moneda is 'Moneda originala a facturii (RON implicit). total_factura ramane mereu in RON.';
comment on column public.obligatii.valoare_valuta is 'Suma originala din factura, in moneda ei (null daca moneda=RON).';
comment on column public.obligatii.curs_valutar is 'Cursul BNR folosit la conversie, din data facturii (null daca moneda=RON).';
