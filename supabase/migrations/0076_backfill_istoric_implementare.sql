-- ============================================================================
-- Script unic, de rulat o singura data: forteaza un instantaneu de istoric
-- CHIAR ACUM pentru toate oportunitatile, cu valorile lor curente reale.
--
-- De ce e nevoie: migratia 0073 a adaugat urmarirea "forecast_implementare"
-- in istoric, dar noul declansator (trigger) scrie un rand nou DOAR cand o
-- oportunitate e efectiv salvata/editata dupa migratie. Daca nicio
-- oportunitate n-a mai fost editata de atunci, istoricul ramane "vechi" (cu
-- forecast_implementare gol la toate randurile), iar graficul de Evolutie
-- Implementare nu are de unde porni.
--
-- Acest script insereaza manual, o singura data, cate un rand de istoric
-- "la zi" pentru fiecare oportunitate, cu valoarea de implementare REALA de
-- azi - de aici incolo, graficul are un punct de plecare corect, iar
-- declansatorul (deja activ) continua sa acumuleze normal la orice editare
-- viitoare.
-- ============================================================================

insert into public.opportunity_history (
  opportunity_id, stage, status, substatus, probability,
  arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise,
  forecast_implementare,
  snapshot
)
select
  id, stage, status, substatus, probability,
  arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise,
  forecast_implementare,
  to_jsonb(o)
from public.opportunities o;
