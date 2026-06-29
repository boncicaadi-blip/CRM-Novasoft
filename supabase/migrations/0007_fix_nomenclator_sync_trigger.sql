-- ============================================================================
-- Fix critic: trigger-ul sync_opportunity_nomenclator_text (din 0004) rula
-- necondiționat "daca *_id IS NOT NULL, suprascrie textul cu valoarea din
-- nomenclator". Pe un UPDATE parțial care schimba doar coloana text (ex.
-- Kanban trimite doar `stage`, fara `stage_id`), Postgres populeaza
-- automat `new.stage_id` cu valoarea VECHE din rand (neschimbata) - iar
-- trigger-ul o vedea "not null" si suprascria `new.stage` inapoi la
-- valoarea veche, anuland complet schimbarea. Acesta era motivul pentru
-- care drag&drop pe Kanban (si orice alt update partial pe coloane cu
-- nomenclator) "revenea la loc".
--
-- Fix: trigger-ul sincronizeaza textul din *_id DOAR daca *_id s-a schimbat
-- efectiv fata de randul vechi (OLD). Daca *_id e neschimbat dar textul s-a
-- schimbat (cazul Kanban/Calendar), facem sincronizarea inversa: cautam
-- *_id-ul care corespunde noului text (sau il punem null, daca textul nu
-- mai corespunde niciunei valori din nomenclator - poate fi text liber).
-- ============================================================================

create or replace function public.sync_opportunity_nomenclator_text()
returns trigger as $$
begin
  -- domeniul_activitate
  if new.domeniul_activitate_id is distinct from old.domeniul_activitate_id then
    if new.domeniul_activitate_id is not null then
      select valoare into new.domeniul_activitate from public.nomenclatoare where id = new.domeniul_activitate_id;
    end if;
  elsif new.domeniul_activitate is distinct from old.domeniul_activitate then
    select id into new.domeniul_activitate_id from public.nomenclatoare
      where categorie = 'domeniu_activitate' and valoare = new.domeniul_activitate limit 1;
  end if;

  -- produs_serviciu_propus
  if new.produs_serviciu_propus_id is distinct from old.produs_serviciu_propus_id then
    if new.produs_serviciu_propus_id is not null then
      select valoare into new.produs_serviciu_propus from public.nomenclatoare where id = new.produs_serviciu_propus_id;
    end if;
  elsif new.produs_serviciu_propus is distinct from old.produs_serviciu_propus then
    select id into new.produs_serviciu_propus_id from public.nomenclatoare
      where categorie = 'produs_serviciu' and valoare = new.produs_serviciu_propus limit 1;
  end if;

  -- tip_proiect
  if new.tip_proiect_id is distinct from old.tip_proiect_id then
    if new.tip_proiect_id is not null then
      select valoare into new.tip_proiect from public.nomenclatoare where id = new.tip_proiect_id;
    end if;
  elsif new.tip_proiect is distinct from old.tip_proiect then
    select id into new.tip_proiect_id from public.nomenclatoare
      where categorie = 'tip_proiect' and valoare = new.tip_proiect limit 1;
  end if;

  -- canal_intrare
  if new.canal_intrare_id is distinct from old.canal_intrare_id then
    if new.canal_intrare_id is not null then
      select valoare into new.canal_intrare from public.nomenclatoare where id = new.canal_intrare_id;
    end if;
  elsif new.canal_intrare is distinct from old.canal_intrare then
    select id into new.canal_intrare_id from public.nomenclatoare
      where categorie = 'canal_intrare' and valoare = new.canal_intrare limit 1;
  end if;

  -- actiune
  if new.actiune_id is distinct from old.actiune_id then
    if new.actiune_id is not null then
      select valoare into new.actiune from public.nomenclatoare where id = new.actiune_id;
    end if;
  elsif new.actiune is distinct from old.actiune then
    select id into new.actiune_id from public.nomenclatoare
      where categorie = 'actiune' and valoare = new.actiune limit 1;
  end if;

  -- status_actiune
  if new.status_actiune_id is distinct from old.status_actiune_id then
    if new.status_actiune_id is not null then
      select valoare into new.status_actiune from public.nomenclatoare where id = new.status_actiune_id;
    end if;
  elsif new.status_actiune is distinct from old.status_actiune then
    select id into new.status_actiune_id from public.nomenclatoare
      where categorie = 'status_actiune' and valoare = new.status_actiune limit 1;
  end if;

  -- stage
  if new.stage_id is distinct from old.stage_id then
    if new.stage_id is not null then
      select valoare into new.stage from public.nomenclatoare where id = new.stage_id;
    end if;
  elsif new.stage is distinct from old.stage then
    select id into new.stage_id from public.nomenclatoare
      where categorie = 'stage' and valoare = new.stage limit 1;
  end if;

  -- status
  if new.status_id is distinct from old.status_id then
    if new.status_id is not null then
      select valoare into new.status from public.nomenclatoare where id = new.status_id;
    end if;
  elsif new.status is distinct from old.status then
    select id into new.status_id from public.nomenclatoare
      where categorie = 'status' and valoare = new.status limit 1;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger-ul ramane BEFORE UPDATE (modifica NEW inainte de scriere), dar
-- pe INSERT nu mai are sens logica "OLD vs NEW" (OLD nu exista la insert),
-- asa ca separam: pe INSERT sincronizam mereu *_id -> text (e singurul sens
-- posibil, formularul de creare trimite intotdeauna *_id).

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
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_nomenclator_text on public.opportunities;

create trigger trg_sync_nomenclator_text_insert
  before insert on public.opportunities
  for each row execute function public.sync_opportunity_nomenclator_text_insert();

create trigger trg_sync_nomenclator_text_update
  before update on public.opportunities
  for each row execute function public.sync_opportunity_nomenclator_text();
