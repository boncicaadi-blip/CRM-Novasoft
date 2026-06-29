-- ============================================================================
-- Propagare automata a redenumirilor de nomenclator catre oportunitatile
-- care folosesc valoarea respectiva. Strategie: adaugam coloane `_id` care
-- tin o referinta reala (foreign key) catre nomenclatoare, populate automat
-- din valoarea text existenta. Coloanele text originale raman sursa de
-- afisare/filtrare (neschimbate ca nume si tip, deci tot codul existent
-- continua sa functioneze), dar sunt sincronizate automat de un trigger
-- de fiecare data cand se modifica `valoare` intr-un rand din nomenclatoare.
-- ============================================================================

-- Coloane noi de referinta (nullable - o oportunitate poate avea o valoare
-- "libera", introdusa manual, care nu corespunde niciunui rand din nomenclatoare)
alter table public.opportunities
  add column if not exists domeniul_activitate_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists produs_serviciu_propus_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists tip_proiect_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists canal_intrare_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists actiune_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists status_actiune_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists stage_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists status_id uuid references public.nomenclatoare(id) on delete set null;

create index if not exists idx_opp_domeniu_id on public.opportunities (domeniul_activitate_id);
create index if not exists idx_opp_produs_id on public.opportunities (produs_serviciu_propus_id);
create index if not exists idx_opp_tip_proiect_id on public.opportunities (tip_proiect_id);
create index if not exists idx_opp_canal_id on public.opportunities (canal_intrare_id);
create index if not exists idx_opp_actiune_id on public.opportunities (actiune_id);
create index if not exists idx_opp_status_actiune_id on public.opportunities (status_actiune_id);
create index if not exists idx_opp_stage_id on public.opportunities (stage_id);
create index if not exists idx_opp_status_id on public.opportunities (status_id);

-- ----------------------------------------------------------------------------
-- Populare initiala: pentru fiecare oportunitate, gasim nomenclatorul
-- corespunzator (match exact text + categorie) si setam id-ul de referinta.
-- ----------------------------------------------------------------------------

update public.opportunities o
set domeniul_activitate_id = n.id
from public.nomenclatoare n
where n.categorie = 'domeniu_activitate' and n.valoare = o.domeniul_activitate
  and o.domeniul_activitate_id is null;

update public.opportunities o
set produs_serviciu_propus_id = n.id
from public.nomenclatoare n
where n.categorie = 'produs_serviciu' and n.valoare = o.produs_serviciu_propus
  and o.produs_serviciu_propus_id is null;

update public.opportunities o
set tip_proiect_id = n.id
from public.nomenclatoare n
where n.categorie = 'tip_proiect' and n.valoare = o.tip_proiect
  and o.tip_proiect_id is null;

update public.opportunities o
set canal_intrare_id = n.id
from public.nomenclatoare n
where n.categorie = 'canal_intrare' and n.valoare = o.canal_intrare
  and o.canal_intrare_id is null;

update public.opportunities o
set actiune_id = n.id
from public.nomenclatoare n
where n.categorie = 'actiune' and n.valoare = o.actiune
  and o.actiune_id is null;

update public.opportunities o
set status_actiune_id = n.id
from public.nomenclatoare n
where n.categorie = 'status_actiune' and n.valoare = o.status_actiune
  and o.status_actiune_id is null;

update public.opportunities o
set stage_id = n.id
from public.nomenclatoare n
where n.categorie = 'stage' and n.valoare = o.stage
  and o.stage_id is null;

update public.opportunities o
set status_id = n.id
from public.nomenclatoare n
where n.categorie = 'status' and n.valoare = o.status
  and o.status_id is null;

-- ----------------------------------------------------------------------------
-- Trigger: la fiecare INSERT/UPDATE pe opportunities, daca s-a setat un *_id
-- dar coloana text nu corespunde valorii curente a nomenclatorului, o
-- sincronizam automat - asta acopera atat scrierile noi (formularul trimite
-- id-ul ales) cat si eventuale discrepante.
-- ----------------------------------------------------------------------------

create or replace function public.sync_opportunity_nomenclator_text()
returns trigger as $$
begin
  if new.domeniul_activitate_id is not null then
    select valoare into new.domeniul_activitate from public.nomenclatoare where id = new.domeniul_activitate_id;
  end if;
  if new.produs_serviciu_propus_id is not null then
    select valoare into new.produs_serviciu_propus from public.nomenclatoare where id = new.produs_serviciu_propus_id;
  end if;
  if new.tip_proiect_id is not null then
    select valoare into new.tip_proiect from public.nomenclatoare where id = new.tip_proiect_id;
  end if;
  if new.canal_intrare_id is not null then
    select valoare into new.canal_intrare from public.nomenclatoare where id = new.canal_intrare_id;
  end if;
  if new.actiune_id is not null then
    select valoare into new.actiune from public.nomenclatoare where id = new.actiune_id;
  end if;
  if new.status_actiune_id is not null then
    select valoare into new.status_actiune from public.nomenclatoare where id = new.status_actiune_id;
  end if;
  if new.stage_id is not null then
    select valoare into new.stage from public.nomenclatoare where id = new.stage_id;
  end if;
  if new.status_id is not null then
    select valoare into new.status from public.nomenclatoare where id = new.status_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_nomenclator_text on public.opportunities;
create trigger trg_sync_nomenclator_text
  before insert or update on public.opportunities
  for each row execute function public.sync_opportunity_nomenclator_text();

-- ----------------------------------------------------------------------------
-- Trigger pe nomenclatoare: cand se redenumeste o valoare, propagam catre
-- toate oportunitatile care o refera prin *_id. Acesta e mecanismul real
-- de "propagare automata" cerut.
-- ----------------------------------------------------------------------------

create or replace function public.propagate_nomenclator_rename()
returns trigger as $$
begin
  if new.valoare = old.valoare then
    return new;
  end if;

  if new.categorie = 'domeniu_activitate' then
    update public.opportunities set domeniul_activitate = new.valoare where domeniul_activitate_id = new.id;
  elsif new.categorie = 'produs_serviciu' then
    update public.opportunities set produs_serviciu_propus = new.valoare where produs_serviciu_propus_id = new.id;
  elsif new.categorie = 'tip_proiect' then
    update public.opportunities set tip_proiect = new.valoare where tip_proiect_id = new.id;
  elsif new.categorie = 'canal_intrare' then
    update public.opportunities set canal_intrare = new.valoare where canal_intrare_id = new.id;
  elsif new.categorie = 'actiune' then
    update public.opportunities set actiune = new.valoare where actiune_id = new.id;
  elsif new.categorie = 'status_actiune' then
    update public.opportunities set status_actiune = new.valoare where status_actiune_id = new.id;
  elsif new.categorie = 'stage' then
    update public.opportunities set stage = new.valoare where stage_id = new.id;
  elsif new.categorie = 'status' then
    update public.opportunities set status = new.valoare where status_id = new.id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_propagate_nomenclator_rename on public.nomenclatoare;
create trigger trg_propagate_nomenclator_rename
  after update on public.nomenclatoare
  for each row execute function public.propagate_nomenclator_rename();
