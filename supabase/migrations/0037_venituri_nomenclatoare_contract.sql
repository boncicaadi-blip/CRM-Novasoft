-- ============================================================================
-- Nomenclatoare noi pentru modulul Venituri - Produs si Serviciu (specifice
-- Venituri, distincte de "produs_serviciu" din CRM, care e o lista mult mai
-- simpla folosita altundeva), Tip Venit, Stadiu Contract, Status Contract,
-- Modalitate facturare. Seed cu valorile reale din rapoartele Power BI.
-- ============================================================================

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('venit_produs', 'SYNERGO', 1),
  ('venit_produs', 'SOFTWARE CLIENT', 2),
  ('venit_produs', 'ONE ERP', 3),
  ('venit_produs', 'SAF-T', 4),
  ('venit_produs', 'E-FACTURA', 5),
  ('venit_produs', 'HOSTING', 6),
  ('venit_produs', 'E-TRANSPORT', 7),
  ('venit_produs', 'CARES', 8)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('venit_serviciu', 'MENTENANTA', 1),
  ('venit_serviciu', 'SUPORT TEHNIC', 2),
  ('venit_serviciu', 'LICENTA&IMPLEMENTARE', 3),
  ('venit_serviciu', 'IMPLEMENTARE', 4),
  ('venit_serviciu', 'SAAS', 5),
  ('venit_serviciu', 'PACHET ANUAL', 6),
  ('venit_serviciu', 'IAAS', 7),
  ('venit_serviciu', 'SERVICII SUPLIMENTARE', 8)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('tip_venit_contract', 'Recurent', 1),
  ('tip_venit_contract', 'Nerecurent', 2)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('stadiu_contract', 'Contractat', 1),
  ('stadiu_contract', 'Necontractat', 2)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('status_contract', 'Activ', 1),
  ('status_contract', 'Inactiv', 2)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('modalitate_facturare', 'Lunar', 1),
  ('modalitate_facturare', 'Trimestrial', 2),
  ('modalitate_facturare', 'Semestrial', 3),
  ('modalitate_facturare', 'Anual', 4),
  ('modalitate_facturare', 'Rate', 5),
  ('modalitate_facturare', 'Etape', 6),
  ('modalitate_facturare', 'Integral', 7)
on conflict (categorie, valoare) do nothing;

-- ============================================================================
-- Restructurare contracte: tip_venit obligatoriu (Recurent/Nerecurent),
-- status_contract inlocuieste status (doar Activ/Inactiv, nu mai Suspendat),
-- opportunity_id direct pe contract (clientul se alege din Oportunitati).
-- ============================================================================

alter table public.contracte add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;
alter table public.contracte add column if not exists tip_venit text not null default 'Recurent' check (tip_venit in ('Recurent', 'Nerecurent'));

alter table public.contracte drop constraint if exists contracte_status_check;
alter table public.contracte rename column status to status_contract;
alter table public.contracte alter column status_contract set default 'Activ';
alter table public.contracte add constraint contracte_status_contract_check check (status_contract in ('Activ', 'Inactiv'));

-- Contractele existente (Suspendat, daca exista) devin Inactiv - nu mai
-- pastram trei stari, doar doua.
update public.contracte set status_contract = 'Inactiv' where status_contract not in ('Activ', 'Inactiv');

comment on column public.contracte.tip_venit is 'Recurent = genereaza automat linii lunare. Nerecurent = genereaza o singura linie, pentru luna de inceput.';
comment on column public.contracte.status_contract is 'Activ/Inactiv - controleaza daca genereaza linii de venit. Util pentru a introduce contracte in avans, inainte sa se activeze.';
comment on column public.contracte.stadiu_contract is 'Contractat/Necontractat - informativ, nu controleaza generarea.';
