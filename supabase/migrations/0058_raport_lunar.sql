-- ============================================================================
-- B-13: Raport comercial lunar (Management).
--
-- get_raport_lunar(months_back): reconstruieste, pentru fiecare din
-- ultimele `months_back` luni calendaristice (implicit 12), evolutia:
--   - Pipeline Total Activ si Forecast Total la finalul lunii (folosind
--     acelasi mecanism ca get_pipeline_snapshot_at, reutilizat prin LATERAL)
--   - Valoarea castigata in acea luna (prima data la care o oportunitate a
--     ajuns la status 'Castigata', reconstruita din opportunity_history)
--   - Numarul de oportunitati castigate / pierdute in acea luna
--   - Numarul de oportunitati noi (create) in acea luna
--   - Target lunar (target anual din target_comercial_anual / 12)
--
-- Lunile fara istoric suficient de vechi apar cu 0 / null, nu lipsesc din
-- rezultat - UI-ul afiseaza explicit golul, nu inventeaza o valoare.
-- ============================================================================

create or replace function public.get_raport_lunar(months_back integer default 12)
returns table (
  luna_start date,
  pipeline_total_activ numeric,
  forecast_total numeric,
  castigat_total numeric,
  nr_castigate integer,
  nr_pierdute integer,
  nr_oportunitati_noi integer,
  target_lunar numeric
)
language sql
stable
security invoker
as $$
  with luni as (
    select (date_trunc('month', now()) - (n || ' months')::interval)::date as luna_start
    from generate_series(0, greatest(months_back, 1) - 1) as n
  ),
  prima_castigare as (
    select opportunity_id, min(snapshot_date) as data_eveniment
    from public.opportunity_history
    where (snapshot->>'status') = 'Castigata'
    group by opportunity_id
  ),
  prima_pierdere as (
    select opportunity_id, min(snapshot_date) as data_eveniment
    from public.opportunity_history
    where (snapshot->>'status') = 'Pierduta'
    group by opportunity_id
  ),
  castigate_pe_luna as (
    select
      date_trunc('month', pc.data_eveniment)::date as luna_start,
      count(*)::integer as nr,
      sum(
        coalesce(o.arr_synergo, 0)
        + coalesce(o.licenta_synergo_onpremise, 0)
        + coalesce(o.valoare_implementare_synergo, 0)
      ) as valoare
    from prima_castigare pc
    join public.opportunities o on o.id = pc.opportunity_id
    group by 1
  ),
  pierdute_pe_luna as (
    select date_trunc('month', pp.data_eveniment)::date as luna_start, count(*)::integer as nr
    from prima_pierdere pp
    group by 1
  ),
  noi_pe_luna as (
    select date_trunc('month', o.created_at)::date as luna_start, count(*)::integer as nr
    from public.opportunities o
    group by 1
  )
  select
    l.luna_start,
    coalesce(snap.pipeline_activ_saas, 0) + coalesce(snap.pipeline_activ_onprem, 0)
      + coalesce(snap.pipeline_activ_implementare, 0) as pipeline_total_activ,
    coalesce(snap.forecast_total_saas, 0) + coalesce(snap.forecast_total_onpremise, 0) as forecast_total,
    coalesce(cl.valoare, 0) as castigat_total,
    coalesce(cl.nr, 0) as nr_castigate,
    coalesce(pl.nr, 0) as nr_pierdute,
    coalesce(nl.nr, 0) as nr_oportunitati_noi,
    case when tca.target is not null then round(tca.target / 12.0, 2) else null end as target_lunar
  from luni l
  left join lateral public.get_pipeline_snapshot_at(
    ((l.luna_start + interval '1 month') - interval '1 second')::timestamptz
  ) snap on true
  left join castigate_pe_luna cl on cl.luna_start = l.luna_start
  left join pierdute_pe_luna pl on pl.luna_start = l.luna_start
  left join noi_pe_luna nl on nl.luna_start = l.luna_start
  left join public.target_comercial_anual tca on tca.an = extract(year from l.luna_start)::integer
  order by l.luna_start;
$$;

comment on function public.get_raport_lunar is
  'B-13: evolutia lunara (ultimele N luni) a pipeline-ului, forecast-ului, valorii castigate si target-ului - pentru Raportul comercial lunar din Management.';
