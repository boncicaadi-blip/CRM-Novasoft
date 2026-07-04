-- ============================================================================
-- Fundatia modulului Venituri: Contracte (genereaza automat venit recurent,
-- luna de luna) + Venituri_linii (jurnalul real, atat generat din contracte
-- cat si introdus manual pentru venituri nerecurente).
--
-- Regula de baza, ca sa nu se piarda niciodata bugetul initial: odata
-- generata o linie pentru o luna, venit_estimat NU se mai schimba automat -
-- daca valoarea unui contract se modifica (indexare, upgrade), doar lunile
-- VIITOARE, inca negenerate, vor folosi noua valoare. Lunile deja generate
-- raman inghetate la ce era bugetat atunci.
-- ============================================================================

create table if not exists public.contracte (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  nume_client text not null,
  produs text,
  serviciu text,
  valoare_lunara numeric(12, 2) not null default 0,
  data_inceput date not null,
  data_sfarsit date,
  status text not null default 'Activ' check (status in ('Activ', 'Inactiv', 'Suspendat')),
  stadiu_contract text,
  modalitate_facturare text,
  observatii text,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.contracte is 'Contracte de venit recurent - un singur produs/serviciu per contract. Valoare_lunara e mereu valoarea CURENTA, folosita doar pentru liniile viitoare, inca negenerate.';

create index if not exists contracte_partner_id_idx on public.contracte (partner_id);
create index if not exists contracte_status_idx on public.contracte (status);

-- ----------------------------------------------------------------------------

create table if not exists public.venituri_linii (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracte(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  nume_client text not null,
  tip_venit text not null check (tip_venit in ('Recurent', 'Nerecurent')),
  produs text,
  serviciu text,
  luna date not null,
  venit_estimat numeric(12, 2) not null default 0,
  venit_realizat numeric(12, 2),
  facturat boolean not null default false,
  observatii text,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.venituri_linii is 'Jurnalul real de venituri - o linie per client x produs x serviciu x luna. Generate automat din contracte (Recurent) sau introduse manual (Nerecurent). venit_estimat e bugetul, inghetat odata creat.';

-- Nu putem genera de doua ori aceeasi luna pentru acelasi contract.
create unique index if not exists venituri_linii_contract_luna_idx
  on public.venituri_linii (contract_id, luna)
  where contract_id is not null;

create index if not exists venituri_linii_luna_idx on public.venituri_linii (luna);
create index if not exists venituri_linii_partner_id_idx on public.venituri_linii (partner_id);

-- ----------------------------------------------------------------------------

create or replace function public.trg_venituri_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizat_la = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.contracte;
create trigger set_updated_at
  before update on public.contracte
  for each row execute function public.trg_venituri_set_updated_at();

drop trigger if exists set_updated_at on public.venituri_linii;
create trigger set_updated_at
  before update on public.venituri_linii
  for each row execute function public.trg_venituri_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: modulul Venituri & Cheltuieli, nu Creante & Obligatii.

alter table public.contracte enable row level security;
alter table public.venituri_linii enable row level security;

drop policy if exists "contracte_module_access" on public.contracte;
create policy "contracte_module_access" on public.contracte
  for all using (public.has_module_access('venituri_cheltuieli'))
  with check (public.has_module_access('venituri_cheltuieli'));

drop policy if exists "venituri_linii_module_access" on public.venituri_linii;
create policy "venituri_linii_module_access" on public.venituri_linii
  for all using (public.has_module_access('venituri_cheltuieli'))
  with check (public.has_module_access('venituri_cheltuieli'));
