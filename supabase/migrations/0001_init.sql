-- ============================================================================
-- Pipeline CRM — schema initiala
-- ============================================================================

-- Extensie pentru generare UUID
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM-uri pentru campurile cu lista fixa de valori
-- Folosim text + check constraint in loc de enum nativ, ca sa poti adauga
-- valori noi fara migratie (ALTER TYPE e dureros in Postgres).
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Utilizatori aplicatiei (Adrian, Stefan etc). Legat 1:1 de auth.users.';

-- ----------------------------------------------------------------------------
-- Tabelul principal: opportunities (echivalentul foii "Pipeline")
-- ----------------------------------------------------------------------------

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_code text unique, -- ex: OPP-0001, generat automat la insert

  -- Identificare firma
  nume_grup text not null,
  nume_potential text not null,
  cod_fiscal text,
  responsabil_vanzare_id uuid references public.profiles (id),
  domeniul_activitate text, -- TRM, CE, TRM+CE, LOGISTICA, SECURITATE, PERSOANE
  judet text,
  oras text,

  -- Calificare tehnica
  solutia_existenta text,
  client_novasoft boolean default false,
  client_windsoft boolean default false,
  produs_serviciu_propus text, -- SYNERGO, ONE ERP, PLANIFICATOR, CONTABILITATE
  contabilitate_interna text, -- DA / NU / NU STIU
  solutie_contabilitate text,
  mai_multe_firme_grup boolean default false,
  nr_societati_suplimentare integer,
  nume_societati_suplimentare text,
  potential_fonduri_europene boolean default false,
  furnizori_combustibil_1 text,
  furnizori_combustibil_2 text,
  furnizori_combustibil_3 text,
  furnizori_gps_1 text,
  furnizori_gps_2 text,
  interes_planificator boolean default false,
  nr_vehicule integer,
  detalii_suplimentare_software text,

  -- Pipeline & status
  data_contactarii date,
  stage text not null default 'Suspect', -- Suspect, Calificare, Prezentare, Programare prezentare, Ofertare, Negociere, Contractare
  status text not null default 'Activa', -- Activa, Castigata, Pierduta, Amanata
  substatus text,
  motivatia_substatusului text,
  probability numeric(5, 2) default 0, -- 0..1

  -- Actiune curenta (follow-up)
  actiune text,
  data_actiune date,
  status_actiune text, -- Planificata, Finalizata
  data_finalizare_actiune date,
  observatii_actiune text,

  -- Tip proiect & pricing
  tip_proiect text, -- TMS, Contabilitate, TMS + Contabilitate, Power BI, Web Clienti
  nr_utilizatori_synergo integer,
  valoare_saas_anuala numeric(12, 2) default 0,
  valoare_pachet_server_anual numeric(12, 2) default 0,
  valoare_firma_suplimentara numeric(12, 2) default 0,
  arr_synergo numeric(12, 2) default 0,
  mrr_synergo numeric(12, 2) default 0,
  valoare_pret_per_user numeric(12, 2) default 0,
  pachet_synergo_onpremise numeric(12, 2) default 0,
  licenta_companie_suplimentara numeric(12, 2) default 0,
  licenta_useri_suplimentari_onpremise numeric(12, 2) default 0,
  licenta_synergo_onpremise numeric(12, 2) default 0,
  valoare_mentenanta_per_user_onpremise numeric(12, 2) default 0,
  valoare_mentenanta_lunara_onpremise numeric(12, 2) default 0,
  valoare_implementare_synergo numeric(12, 2) default 0,

  -- Forecast (calculate de aplicatie, nu de formule fragile)
  forecast_implementare numeric(12, 2) generated always as (valoare_implementare_synergo * probability) stored,
  forecast_licente_onpremise numeric(12, 2) generated always as (licenta_synergo_onpremise * probability) stored,
  forecast_mentenanta_onpremise_lunar numeric(12, 2) generated always as (valoare_mentenanta_lunara_onpremise * probability) stored,
  forecast_saas_lunar numeric(12, 2) generated always as (mrr_synergo * probability) stored,
  forecast_total_saas numeric(12, 2) generated always as (arr_synergo * probability) stored,
  forecast_total_onpremise numeric(12, 2) generated always as (
    (licenta_synergo_onpremise + valoare_implementare_synergo + valoare_mentenanta_lunara_onpremise * 12) * probability
  ) stored,

  -- Sursa & context
  canal_intrare text, -- Direct, Partener, Recomandare, Conferinte
  nume_canal_intrare text,
  oportunitati text,
  feedback text,
  observatii text,

  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.opportunities is 'Echivalentul foii Pipeline din Excel. Sursa de adevar curenta.';

create index if not exists idx_opportunities_stage on public.opportunities (stage);
create index if not exists idx_opportunities_status on public.opportunities (status);
create index if not exists idx_opportunities_responsabil on public.opportunities (responsabil_vanzare_id);
create index if not exists idx_opportunities_data_actiune on public.opportunities (data_actiune);

-- ----------------------------------------------------------------------------
-- Secventa + functie pentru generarea automata a opportunity_code (OPP-0001...)
-- ----------------------------------------------------------------------------

create sequence if not exists public.opportunity_code_seq start 1;

create or replace function public.set_opportunity_code()
returns trigger as $$
begin
  if new.opportunity_code is null then
    new.opportunity_code := 'OPP-' || lpad(nextval('public.opportunity_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_opportunity_code on public.opportunities;
create trigger trg_set_opportunity_code
  before insert on public.opportunities
  for each row execute function public.set_opportunity_code();

-- updated_at automat la fiecare update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_opportunities_updated_at on public.opportunities;
create trigger trg_opportunities_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Istoric: snapshot complet la fiecare schimbare semnificativa
-- (echivalentul foii Pipeline_History — dar generat automat, nu manual)
-- ----------------------------------------------------------------------------

create table if not exists public.opportunity_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  snapshot_date timestamptz not null default now(),
  stage text,
  status text,
  substatus text,
  probability numeric(5, 2),
  arr_synergo numeric(12, 2),
  mrr_synergo numeric(12, 2),
  forecast_total_saas numeric(12, 2),
  forecast_total_onpremise numeric(12, 2),
  changed_by uuid references public.profiles (id),
  snapshot jsonb -- intregul rand, pentru audit complet
);

comment on table public.opportunity_history is 'Inregistreaza automat o linie de istoric de fiecare data cand se modifica o oportunitate (echivalent Pipeline_History).';

create index if not exists idx_history_opportunity on public.opportunity_history (opportunity_id, snapshot_date desc);

-- Trigger: la fiecare INSERT/UPDATE pe opportunities, salvam un snapshot
create or replace function public.record_opportunity_history()
returns trigger as $$
begin
  insert into public.opportunity_history (
    opportunity_id, stage, status, substatus, probability,
    arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise,
    snapshot
  ) values (
    new.id, new.stage, new.status, new.substatus, new.probability,
    new.arr_synergo, new.mrr_synergo, new.forecast_total_saas, new.forecast_total_onpremise,
    to_jsonb(new)
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_record_history on public.opportunities;
create trigger trg_record_history
  after insert or update on public.opportunities
  for each row execute function public.record_opportunity_history();

-- ----------------------------------------------------------------------------
-- Row Level Security: orice utilizator autentificat (Adrian, Stefan, tu)
-- vede si poate edita toate oportunitatile. Simplu, pentru o echipa mica.
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_history enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "opportunities_all_authenticated" on public.opportunities;
create policy "opportunities_all_authenticated" on public.opportunities
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "history_select_authenticated" on public.opportunity_history;
create policy "history_select_authenticated" on public.opportunity_history
  for select using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Trigger: la signup, copiem automat user-ul in profiles
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();
