-- ============================================================================
-- Doua lucruri:
--
-- 1. 11 din cele 102 contracte create la importul istoric au fost, de fapt,
--    reziliate/suspendate ulterior in realitate (ultima stare cunoscuta din
--    sursa nu era "Activ") - dar au fost create ca active pentru ca aveau
--    macar o perioada cu status Activ. Le corectam status_contract la
--    Inactiv si data_sfarsit la ultima luna cunoscuta, ca sa nu li se
--    genereze automat venit viitor pentru ceva incheiat.
--
-- 2. Pentru restul contractelor, chiar active, generam liniile lipsa pana
--    la sfarsitul lui 2026 (folosind valoarea curenta) - multe aveau deja
--    aceasta acoperire din sursa, deci aici se completeaza doar diferenta.
--    Anul 2027 ramane in sarcina utilizatorului, cum a fost stabilit.
-- ============================================================================

-- ---------- 1. Corectie status pentru contractele reziliate/suspendate ----------

with corectii(nume_normalizat, produs, serviciu, ultima_luna) as (
  values
  ('CDC TRANSPORT INNOVATIONS SRL', 'E-FACTURA', 'MENTENANTA', '2025-12-01'::date),
  ('CDC TRANSPORT INNOVATIONS SRL', 'SAF-T', 'MENTENANTA', '2025-12-01'::date),
  ('CDC TRANSPORT INNOVATIONS SRL', 'SOFTWARE CLIENT', 'SUPORT TEHNIC', '2025-12-01'::date),
  ('CDC TRUCK SERVICES SRL', 'E-FACTURA', 'MENTENANTA', '2025-12-01'::date),
  ('CDC TRUCK SERVICES SRL', 'SAF-T', 'MENTENANTA', '2025-12-01'::date),
  ('CDC TRUCK SERVICES SRL', 'SOFTWARE CLIENT', 'SUPORT TEHNIC', '2025-12-01'::date),
  ('COMPACT LACOLI SRL', 'SOFTWARE CLIENT', 'SUPORT TEHNIC', '2024-06-01'::date),
  ('STARTNEXT SRL', 'E-FACTURA', 'MENTENANTA', '2025-12-01'::date),
  ('STARTNEXT SRL', 'SAF-T', 'MENTENANTA', '2025-12-01'::date),
  ('STARTNEXT SRL', 'SOFTWARE CLIENT', 'SUPORT TEHNIC', '2025-12-01'::date),
  ('VECTRA INTERNATIONAL SRL', 'SYNERGO', 'SAAS', '2026-12-01'::date)
)
update public.contracte c
set status_contract = 'Inactiv', data_sfarsit = cor.ultima_luna
from corectii cor
join public.partners p on p.nume_normalizat = cor.nume_normalizat
where c.partner_id = p.id and c.produs = cor.produs and c.serviciu = cor.serviciu;

-- ---------- 2. Completare linii lipsa pana la 2026-12-01, doar pt contracte inca active ----------

with existing_max as (
  select contract_id, max(luna) as max_luna
  from public.venituri_linii
  where contract_id is not null
  group by contract_id
),
target_contracts as (
  select
    c.id as contract_id, c.partner_id, c.nume_client, c.produs, c.serviciu, c.valoare_lunara,
    coalesce(em.max_luna, c.data_inceput - interval '1 month') as start_from
  from public.contracte c
  left join existing_max em on em.contract_id = c.id
  where c.status_contract = 'Activ' and c.tip_venit = 'Recurent' and c.data_sfarsit is null
)
insert into public.venituri_linii (
  contract_id, partner_id, nume_client, tip_venit, produs, serviciu, luna,
  venit_estimat, venit_realizat, facturat
)
select
  tc.contract_id, tc.partner_id, tc.nume_client, 'Recurent', tc.produs, tc.serviciu, gs.luna::date,
  tc.valoare_lunara, null, false
from target_contracts tc
cross join lateral generate_series(
  (tc.start_from + interval '1 month')::date, '2026-12-01'::date, interval '1 month'
) as gs(luna)
on conflict (contract_id, luna) where contract_id is not null do nothing;
