-- ============================================================================
-- Fundatia modulului Cheltuieli - oglinda Venituri: contracte pentru
-- cheltuieli recurente (genereaza automat linii lunare) + cheltuieli_linii
-- ca jurnal real (generat din contracte sau introdus manual pentru
-- cheltuieli nerecurente). Aceeasi regula de baza: odata generata o linie,
-- valoarea_prognozata ramane inghetata - editarea unui contract regenereaza
-- liniile lui (pastrand realizatul deja introdus), la fel ca la Venituri.
-- ============================================================================

create table if not exists public.contracte_cheltuieli (
  id uuid primary key default gen_random_uuid(),
  furnizor text,
  incadrare text not null,
  clasa text not null,
  detaliu text,
  tip_cheltuiala text not null default 'Fixe' check (tip_cheltuiala in ('Fixe', 'Variabile')),
  frecventa text not null default 'Recurenta' check (frecventa in ('Recurenta', 'Nerecurenta')),
  investitie boolean not null default false,
  repartizare boolean not null default false,
  valoare_lunara numeric(12, 2) not null default 0,
  nr_rate integer not null default 1 check (nr_rate >= 1),
  data_inceput date not null,
  data_sfarsit date,
  status_contract text not null default 'Activ' check (status_contract in ('Activ', 'Inactiv')),
  observatii text,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.contracte_cheltuieli is 'Contracte de cheltuiala recurenta - genereaza automat linii lunare in cheltuieli_linii. Pentru Nerecurenta, nr_rate controleaza cate linii (rate) se genereaza, spatiate lunar.';

create index if not exists contracte_cheltuieli_status_idx on public.contracte_cheltuieli (status_contract);

-- ----------------------------------------------------------------------------

create table if not exists public.cheltuieli_linii (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracte_cheltuieli(id) on delete cascade,
  furnizor text,
  incadrare text not null,
  clasa text not null,
  detaliu text,
  frecventa text not null check (frecventa in ('Recurenta', 'Nerecurenta')),
  luna date not null,
  valoare_prognozata numeric(12, 2) not null default 0,
  valoare_realizata numeric(12, 2),
  platit boolean not null default false,
  observatii text,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.cheltuieli_linii is 'Jurnalul real de cheltuieli - o linie per cheltuiala x luna. Generate automat din contracte (Recurenta) sau introduse manual (Nerecurenta). valoare_prognozata e bugetul, inghetat odata creat.';

create unique index if not exists cheltuieli_linii_contract_luna_idx
  on public.cheltuieli_linii (contract_id, luna)
  where contract_id is not null;

create index if not exists cheltuieli_linii_luna_idx on public.cheltuieli_linii (luna);

-- ----------------------------------------------------------------------------

drop trigger if exists set_updated_at on public.contracte_cheltuieli;
create trigger set_updated_at
  before update on public.contracte_cheltuieli
  for each row execute function public.trg_venituri_set_updated_at();

drop trigger if exists set_updated_at on public.cheltuieli_linii;
create trigger set_updated_at
  before update on public.cheltuieli_linii
  for each row execute function public.trg_venituri_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: acelasi modul, Venituri & Cheltuieli.

alter table public.contracte_cheltuieli enable row level security;
alter table public.cheltuieli_linii enable row level security;

drop policy if exists "contracte_cheltuieli_module_access" on public.contracte_cheltuieli;
create policy "contracte_cheltuieli_module_access" on public.contracte_cheltuieli
  for all using (public.has_module_access('venituri_cheltuieli'))
  with check (public.has_module_access('venituri_cheltuieli'));

drop policy if exists "cheltuieli_linii_module_access" on public.cheltuieli_linii;
create policy "cheltuieli_linii_module_access" on public.cheltuieli_linii
  for all using (public.has_module_access('venituri_cheltuieli'))
  with check (public.has_module_access('venituri_cheltuieli'));

-- ----------------------------------------------------------------------------
-- Nomenclatoare pentru Incadrare si Clasa - liste deschise, gestionabile
-- din Setari -> Nomenclatoare. Tip cheltuiala si Frecventa raman selecturi
-- fixe in cod (doar 2 valori posibile fiecare).

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('cheltuiala_incadrare', 'SALARII', 1),
  ('cheltuiala_incadrare', 'SPATIU', 2),
  ('cheltuiala_incadrare', 'INFRASTRUCTURA IT', 3),
  ('cheltuiala_incadrare', 'OUTSOURCING', 4),
  ('cheltuiala_incadrare', 'MARKETING SI PUBLICITATE', 5),
  ('cheltuiala_incadrare', 'REGIE AUTO', 6),
  ('cheltuiala_incadrare', 'REGIE FIRMA', 7),
  ('cheltuiala_incadrare', 'ALTELE', 8)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('cheltuiala_clasa', 'Salarii nete', 1),
  ('cheltuiala_clasa', 'Taxe salariale', 2),
  ('cheltuiala_clasa', 'Beneficii', 3),
  ('cheltuiala_clasa', 'Bonus performanta', 4),
  ('cheltuiala_clasa', 'Externalizare personal', 5),
  ('cheltuiala_clasa', 'Medicina muncii', 6),
  ('cheltuiala_clasa', 'SSM', 7),
  ('cheltuiala_clasa', 'Chirie', 8),
  ('cheltuiala_clasa', 'Utilitati', 9),
  ('cheltuiala_clasa', 'Internet', 10),
  ('cheltuiala_clasa', 'Telefonie', 11),
  ('cheltuiala_clasa', 'Cafea + Apa', 12),
  ('cheltuiala_clasa', 'Consumabile', 13),
  ('cheltuiala_clasa', 'Hosting servere', 14),
  ('cheltuiala_clasa', 'Mentenanta servere', 15),
  ('cheltuiala_clasa', 'Licente', 16),
  ('cheltuiala_clasa', 'Echipamente', 17),
  ('cheltuiala_clasa', 'Echipamente hardware', 18),
  ('cheltuiala_clasa', 'Contabilitate', 19),
  ('cheltuiala_clasa', 'Servicii juridice', 20),
  ('cheltuiala_clasa', 'Costuri ale bunurilor vandute', 21),
  ('cheltuiala_clasa', 'Servicii agentie marketing', 22),
  ('cheltuiala_clasa', 'Servicii externe marketing', 23),
  ('cheltuiala_clasa', 'Servicii marketing', 24),
  ('cheltuiala_clasa', 'Evenimente marketing', 25),
  ('cheltuiala_clasa', 'Evenimente externe', 26),
  ('cheltuiala_clasa', 'Evenimente interne', 27),
  ('cheltuiala_clasa', 'Evenimente', 28),
  ('cheltuiala_clasa', 'Protocol', 29),
  ('cheltuiala_clasa', 'Deplasari', 30),
  ('cheltuiala_clasa', 'Piese Auto', 31),
  ('cheltuiala_clasa', 'Reparatii Auto', 32),
  ('cheltuiala_clasa', 'Asigurari Auto', 33),
  ('cheltuiala_clasa', 'Leasinguri Auto', 34),
  ('cheltuiala_clasa', 'Comisioane', 35),
  ('cheltuiala_clasa', 'Impozit pe profit', 36),
  ('cheltuiala_clasa', 'Majorare Taxe', 37),
  ('cheltuiala_clasa', 'Indexare', 38),
  ('cheltuiala_clasa', 'Administrative', 39),
  ('cheltuiala_clasa', 'Planificat', 40)
on conflict (categorie, valoare) do nothing;
