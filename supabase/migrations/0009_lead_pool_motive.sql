-- ============================================================================
-- Faza 0 + Faza 1 din roadmap: nomenclatoare finale, motiv pierdere/amanare
-- obligatorii, Lead Pool ca stage separat cu promovare automata.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- B-01: "Lead Pool" - stage nou, primul in ordine, inainte de Suspect.
-- Decalam ordinea stage-urilor existente cu 1, ca sa faca loc.
-- ----------------------------------------------------------------------------

update public.nomenclatoare set ordine = ordine + 1 where categorie = 'stage';

insert into public.nomenclatoare (categorie, valoare, culoare, probability, ordine)
values ('stage', 'Lead Pool', '#64748B', 0.02, 1)
on conflict (categorie, valoare) do nothing;

-- ----------------------------------------------------------------------------
-- B-02 / B-03: nomenclatoare noi - Motiv pierdere, Motiv amanare.
-- ----------------------------------------------------------------------------

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('motiv_pierdere', 'Pret', 1),
  ('motiv_pierdere', 'Concurenta', 2),
  ('motiv_pierdere', 'Lipsa buget', 3),
  ('motiv_pierdere', 'Nu este momentul', 4),
  ('motiv_pierdere', 'Nu are nevoie reala', 5),
  ('motiv_pierdere', 'Proiect blocat intern', 6),
  ('motiv_pierdere', 'Lipsa raspuns', 7),
  ('motiv_pierdere', 'Alta solutie aleasa', 8),
  ('motiv_pierdere', 'Decizie management', 9),
  ('motiv_pierdere', 'Fonduri neaprobate', 10)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('motiv_amanare', 'Revine in 30 zile', 1),
  ('motiv_amanare', 'Revine in 60 zile', 2),
  ('motiv_amanare', 'Revine in 90 zile', 3),
  ('motiv_amanare', 'Asteapta buget', 4),
  ('motiv_amanare', 'Asteapta fonduri', 5),
  ('motiv_amanare', 'Asteapta decizie interna', 6),
  ('motiv_amanare', 'Asteapta management', 7),
  ('motiv_amanare', 'Sezon nepotrivit', 8),
  ('motiv_amanare', 'Recontactare la eveniment', 9)
on conflict (categorie, valoare) do nothing;

-- ----------------------------------------------------------------------------
-- Coloane noi pe opportunities: motiv pierdere/amanare (referinta + text
-- sincronizat, ca restul nomenclatoarelor), data de revenire.
-- ----------------------------------------------------------------------------

alter table public.opportunities
  add column if not exists motiv_pierdere_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists motiv_pierdere text,
  add column if not exists motiv_amanare_id uuid references public.nomenclatoare(id) on delete set null,
  add column if not exists motiv_amanare text,
  add column if not exists data_revenire date;

create index if not exists idx_opp_motiv_pierdere_id on public.opportunities (motiv_pierdere_id);
create index if not exists idx_opp_motiv_amanare_id on public.opportunities (motiv_amanare_id);

comment on column public.opportunities.motiv_pierdere is 'Obligatoriu cand status = Pierduta (validat in aplicatie, nu la nivel de DB, pentru mesaje de eroare clare).';
comment on column public.opportunities.motiv_amanare is 'Obligatoriu cand status = Amanata, impreuna cu data_revenire.';
comment on column public.opportunities.data_revenire is 'Data estimata de recontactare, obligatorie cand status = Amanata.';

-- ----------------------------------------------------------------------------
-- Extindem trigger-ele de sincronizare nomenclator (din 0007) ca sa acopere
-- si motiv_pierdere_id / motiv_amanare_id, cu aceeasi logica bidirectionala
-- (sincronizam *_id -> text daca *_id s-a schimbat, altfel text -> *_id).
-- ----------------------------------------------------------------------------

create or replace function public.sync_opportunity_nomenclator_text()
returns trigger as $$
begin
  if new.domeniul_activitate_id is distinct from old.domeniul_activitate_id then
    if new.domeniul_activitate_id is not null then
      select valoare into new.domeniul_activitate from public.nomenclatoare where id = new.domeniul_activitate_id;
    end if;
  elsif new.domeniul_activitate is distinct from old.domeniul_activitate then
    select id into new.domeniul_activitate_id from public.nomenclatoare
      where categorie = 'domeniu_activitate' and valoare = new.domeniul_activitate limit 1;
  end if;

  if new.produs_serviciu_propus_id is distinct from old.produs_serviciu_propus_id then
    if new.produs_serviciu_propus_id is not null then
      select valoare into new.produs_serviciu_propus from public.nomenclatoare where id = new.produs_serviciu_propus_id;
    end if;
  elsif new.produs_serviciu_propus is distinct from old.produs_serviciu_propus then
    select id into new.produs_serviciu_propus_id from public.nomenclatoare
      where categorie = 'produs_serviciu' and valoare = new.produs_serviciu_propus limit 1;
  end if;

  if new.tip_proiect_id is distinct from old.tip_proiect_id then
    if new.tip_proiect_id is not null then
      select valoare into new.tip_proiect from public.nomenclatoare where id = new.tip_proiect_id;
    end if;
  elsif new.tip_proiect is distinct from old.tip_proiect then
    select id into new.tip_proiect_id from public.nomenclatoare
      where categorie = 'tip_proiect' and valoare = new.tip_proiect limit 1;
  end if;

  if new.canal_intrare_id is distinct from old.canal_intrare_id then
    if new.canal_intrare_id is not null then
      select valoare into new.canal_intrare from public.nomenclatoare where id = new.canal_intrare_id;
    end if;
  elsif new.canal_intrare is distinct from old.canal_intrare then
    select id into new.canal_intrare_id from public.nomenclatoare
      where categorie = 'canal_intrare' and valoare = new.canal_intrare limit 1;
  end if;

  if new.actiune_id is distinct from old.actiune_id then
    if new.actiune_id is not null then
      select valoare into new.actiune from public.nomenclatoare where id = new.actiune_id;
    end if;
  elsif new.actiune is distinct from old.actiune then
    select id into new.actiune_id from public.nomenclatoare
      where categorie = 'actiune' and valoare = new.actiune limit 1;
  end if;

  if new.status_actiune_id is distinct from old.status_actiune_id then
    if new.status_actiune_id is not null then
      select valoare into new.status_actiune from public.nomenclatoare where id = new.status_actiune_id;
    end if;
  elsif new.status_actiune is distinct from old.status_actiune then
    select id into new.status_actiune_id from public.nomenclatoare
      where categorie = 'status_actiune' and valoare = new.status_actiune limit 1;
  end if;

  if new.stage_id is distinct from old.stage_id then
    if new.stage_id is not null then
      select valoare into new.stage from public.nomenclatoare where id = new.stage_id;
    end if;
  elsif new.stage is distinct from old.stage then
    select id into new.stage_id from public.nomenclatoare
      where categorie = 'stage' and valoare = new.stage limit 1;
  end if;

  if new.status_id is distinct from old.status_id then
    if new.status_id is not null then
      select valoare into new.status from public.nomenclatoare where id = new.status_id;
    end if;
  elsif new.status is distinct from old.status then
    select id into new.status_id from public.nomenclatoare
      where categorie = 'status' and valoare = new.status limit 1;
  end if;

  -- motiv_pierdere
  if new.motiv_pierdere_id is distinct from old.motiv_pierdere_id then
    if new.motiv_pierdere_id is not null then
      select valoare into new.motiv_pierdere from public.nomenclatoare where id = new.motiv_pierdere_id;
    end if;
  elsif new.motiv_pierdere is distinct from old.motiv_pierdere then
    select id into new.motiv_pierdere_id from public.nomenclatoare
      where categorie = 'motiv_pierdere' and valoare = new.motiv_pierdere limit 1;
  end if;

  -- motiv_amanare
  if new.motiv_amanare_id is distinct from old.motiv_amanare_id then
    if new.motiv_amanare_id is not null then
      select valoare into new.motiv_amanare from public.nomenclatoare where id = new.motiv_amanare_id;
    end if;
  elsif new.motiv_amanare is distinct from old.motiv_amanare then
    select id into new.motiv_amanare_id from public.nomenclatoare
      where categorie = 'motiv_amanare' and valoare = new.motiv_amanare limit 1;
  end if;

  return new;
end;
$$ language plpgsql;

create or replace function public.sync_opportunity_nomenclator_text_insert()
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
  if new.motiv_pierdere_id is not null then
    select valoare into new.motiv_pierdere from public.nomenclatoare where id = new.motiv_pierdere_id;
  end if;
  if new.motiv_amanare_id is not null then
    select valoare into new.motiv_amanare from public.nomenclatoare where id = new.motiv_amanare_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- B-10 (partial): promovare automata din "Lead Pool" la "Suspect" cand se
-- inregistreaza prima actiune (data_actiune se completeaza pentru prima
-- data pe acea oportunitate). Reguli: doar daca stage curent e Lead Pool.
-- ----------------------------------------------------------------------------

create or replace function public.promote_lead_pool_on_first_action()
returns trigger as $$
begin
  if new.stage = 'Lead Pool'
     and new.data_actiune is not null
     and (old.data_actiune is null or old.data_actiune is distinct from new.data_actiune)
  then
    new.stage := 'Suspect';
    select id into new.stage_id from public.nomenclatoare
      where categorie = 'stage' and valoare = 'Suspect' limit 1;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_promote_lead_pool on public.opportunities;
create trigger trg_promote_lead_pool
  before update on public.opportunities
  for each row execute function public.promote_lead_pool_on_first_action();

-- Trigger-ul de promovare trebuie sa ruleze INAINTE de sincronizarea
-- nomenclator (care citeste new.stage_id), deci recream ordinea explicit:
-- Postgres executa trigger-ele BEFORE in ordine alfabetica de nume implicit,
-- "trg_promote_lead_pool" < "trg_sync_nomenclator_text_update" alfabetic,
-- deci ordinea e deja corecta. Nu e nevoie de actiune suplimentara.
