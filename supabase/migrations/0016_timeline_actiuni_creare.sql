-- ============================================================================
-- Extinde trigger-ul de timeline (din 0014) sa capteze si setarea/schimbarea
-- unei actiuni (next step), nu doar finalizarea ei. Asta da o trasabilitate
-- completa: orice next step planificat vreodata pe oportunitate ramane
-- vizibil in cronologie, chiar daca a fost reprogramat sau inlocuit cu altul
-- inainte de finalizare.
--
-- Tip nou: 'actiune_setata' - folosit cand actiune/data_actiune se schimba
-- si NU e cazul de finalizare (acela ramane 'actiune_finalizata', deja
-- existent din 0014).
-- ============================================================================

alter table public.opportunity_timeline drop constraint if exists opportunity_timeline_tip_check;
alter table public.opportunity_timeline add constraint opportunity_timeline_tip_check check (tip in (
  'nota', 'call', 'email', 'demo', 'oferta_trimisa', 'follow_up',
  'schimbare_stage', 'schimbare_status', 'actiune_finalizata', 'actiune_setata',
  'creare'
));

create or replace function public.log_opportunity_timeline_changes()
returns trigger as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (new.id, 'schimbare_stage', old.stage || ' -> ' || new.stage);
  end if;

  if new.status is distinct from old.status then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (new.id, 'schimbare_status', old.status || ' -> ' || new.status);
  end if;

  if new.status_actiune = 'Finalizata' and old.status_actiune is distinct from new.status_actiune then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_finalizata',
      coalesce(new.actiune, 'Actiune') || coalesce(' - ' || new.observatii_actiune, '')
    );
  -- "actiune_setata": doar cand actiunea/data se schimba SI nu e vorba de
  -- finalizarea celei curente (altfel am duplica acelasi eveniment de doua ori).
  elsif (new.actiune is distinct from old.actiune or new.data_actiune is distinct from old.data_actiune)
        and new.actiune is not null and new.data_actiune is not null then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_setata',
      new.actiune || ' - programat pentru ' || to_char(new.data_actiune, 'DD.MM.YYYY')
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Eveniment de "creare" - inregistrat o singura data, la INSERT, ca primul
-- punct din cronologie (momentul intrarii in sistem).
-- ----------------------------------------------------------------------------

create or replace function public.log_opportunity_creation()
returns trigger as $$
begin
  insert into public.opportunity_timeline (opportunity_id, tip, continut, creat_de)
  values (new.id, 'creare', 'Oportunitate creata - Stage initial: ' || new.stage, new.responsabil_vanzare_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_log_opportunity_creation on public.opportunities;
create trigger trg_log_opportunity_creation
  after insert on public.opportunities
  for each row execute function public.log_opportunity_creation();

-- Populare retroactiva: pentru oportunitatile deja existente (fara eveniment
-- de "creare" in timeline), adaugam unul folosind created_at real.
insert into public.opportunity_timeline (opportunity_id, tip, continut, created_at)
select id, 'creare', 'Oportunitate creata - Stage initial: ' || stage, created_at
from public.opportunities o
where not exists (
  select 1 from public.opportunity_timeline t where t.opportunity_id = o.id and t.tip = 'creare'
);
