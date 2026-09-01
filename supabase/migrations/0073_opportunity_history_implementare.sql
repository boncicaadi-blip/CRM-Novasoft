-- Adauga urmarirea valorii de implementare in istoricul de oportunitati -
-- lipsea complet pana acum, deci "Evolutie Implementare" nu putea fi
-- construita niciodata. De acum incolo, fiecare snapshot include si aceasta
-- valoare (istoricul de dinainte nu poate fi recuperat retroactiv, dar de
-- acum se acumuleaza corect).

alter table public.opportunity_history add column if not exists forecast_implementare numeric(12, 2);

create or replace function public.record_opportunity_history()
returns trigger as $$
begin
  insert into public.opportunity_history (
    opportunity_id, stage, status, substatus, probability,
    arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise,
    forecast_implementare,
    snapshot
  ) values (
    new.id, new.stage, new.status, new.substatus, new.probability,
    new.arr_synergo, new.mrr_synergo, new.forecast_total_saas, new.forecast_total_onpremise,
    new.forecast_implementare,
    to_jsonb(new)
  );
  return new;
end;
$$ language plpgsql;
