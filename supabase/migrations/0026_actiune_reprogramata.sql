-- ============================================================================
-- Distingem in Timeline intre a programa o actiune noua si a reprograma
-- (doar data) o actiune existenta - pana acum ambele cazuri generau acelasi
-- eveniment 'actiune_setata' ("Actiune programata"), chiar si atunci cand
-- userul doar muta data unei actiuni deja existente.
-- ============================================================================

alter table public.opportunity_timeline drop constraint if exists opportunity_timeline_tip_check;
alter table public.opportunity_timeline add constraint opportunity_timeline_tip_check check (tip in (
  'nota', 'call', 'email', 'demo', 'oferta_trimisa', 'follow_up',
  'schimbare_stage', 'schimbare_status', 'actiune_finalizata', 'actiune_setata',
  'creare', 'ai_rezumat', 'actiune_reprogramata'
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
  elsif new.actiune is distinct from old.actiune
        and new.actiune is not null and new.data_actiune is not null then
    -- Actiune noua (text diferit) - indiferent daca s-a schimbat si data.
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_setata',
      new.actiune || ' - programat pentru ' || to_char(new.data_actiune, 'DD.MM.YYYY')
        || coalesce(' · ' || new.observatii_actiune, '')
    );
  elsif new.data_actiune is distinct from old.data_actiune
        and new.actiune is not null and new.data_actiune is not null then
    -- Acelasi text de actiune, doar data s-a schimbat - reprogramare.
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_reprogramata',
      new.actiune || ' - reprogramat pentru ' || to_char(new.data_actiune, 'DD.MM.YYYY')
        || coalesce(' · ' || new.observatii_actiune, '')
    );
  end if;

  return new;
end;
$$ language plpgsql;
