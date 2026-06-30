-- ============================================================================
-- Fix: evenimentul 'actiune_setata' din timeline (la programarea/reprogramarea
-- unei actiuni) nu includea observatiile_actiune - userul vrea sa vada
-- contextul notat, nu doar "Actiune - programat pentru data X".
-- ============================================================================

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
  elsif (new.actiune is distinct from old.actiune or new.data_actiune is distinct from old.data_actiune)
        and new.actiune is not null and new.data_actiune is not null then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_setata',
      new.actiune || ' - programat pentru ' || to_char(new.data_actiune, 'DD.MM.YYYY')
        || coalesce(' · ' || new.observatii_actiune, '')
    );
  end if;

  return new;
end;
$$ language plpgsql;
