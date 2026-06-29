-- ============================================================================
-- Restructurare completa Pricing: SaaS si OnPremise devin sectiuni separate,
-- cu formule de calcul automat identice cu cele din Excel-ul original.
--
-- Campuri introduse manual (SaaS):
--   nr_utilizatori_synergo, valoare_pachet_server_anual, valoare_firma_suplimentara,
--   mrr_synergo
-- Campuri calculate automat (SaaS):
--   valoare_saas_anuala = mrr_synergo * 12
--   arr_synergo = valoare_pachet_server_anual + valoare_firma_suplimentara + valoare_saas_anuala
--   valoare_pret_per_user = mrr_synergo / nr_utilizatori_synergo
--
-- Campuri introduse manual (OnPremise):
--   pachet_synergo_onpremise, licenta_companie_suplimentara,
--   licenta_useri_suplimentari_onpremise, valoare_mentenanta_per_user_onpremise
-- Campuri calculate automat (OnPremise):
--   licenta_synergo_onpremise = pachet + licenta_companie_suplimentara + licenta_useri_suplimentari
--   valoare_mentenanta_lunara_onpremise = valoare_mentenanta_per_user_onpremise * nr_utilizatori_synergo
--
-- Comun: valoare_implementare_synergo (manual, indiferent de mod).
--
-- Forecast (la fel ca in Excel, depinde de probability si de modul activ,
-- dar Forecast Total SaaS / Forecast Total OnPremise se calculeaza
-- independent - daca exista date pe ambele moduri, ambele forecasturi
-- sunt valide simultan, fara suprapunere, exact ca in Excel original).
-- ============================================================================

-- Dezactivam temporar trigger-ul de istoric, ca sa evitam orice risc de
-- update concurent care ar citi o coloana generata in timpul drop+recreate.
alter table public.opportunities disable trigger trg_record_history;

-- Coloanele generate originale (din 0001_init.sql) trebuie inlocuite -
-- Postgres nu permite ALTER pe o generated column, trebuie drop + recreate.

alter table public.opportunities drop column if exists valoare_saas_anuala;
alter table public.opportunities drop column if exists arr_synergo;
alter table public.opportunities drop column if exists valoare_pret_per_user;
alter table public.opportunities drop column if exists licenta_synergo_onpremise;
alter table public.opportunities drop column if exists valoare_mentenanta_lunara_onpremise;
alter table public.opportunities drop column if exists forecast_implementare;
alter table public.opportunities drop column if exists forecast_licente_onpremise;
alter table public.opportunities drop column if exists forecast_mentenanta_onpremise_lunar;
alter table public.opportunities drop column if exists forecast_saas_lunar;
alter table public.opportunities drop column if exists forecast_total_saas;
alter table public.opportunities drop column if exists forecast_total_onpremise;

-- --- SaaS: calculate ---

alter table public.opportunities add column valoare_saas_anuala numeric(12, 2)
  generated always as (round(coalesce(mrr_synergo, 0) * 12, 0)) stored;

alter table public.opportunities add column arr_synergo numeric(12, 2)
  generated always as (
    round(
      coalesce(valoare_pachet_server_anual, 0) +
      coalesce(valoare_firma_suplimentara, 0) +
      coalesce(mrr_synergo, 0) * 12,
      0
    )
  ) stored;

alter table public.opportunities add column valoare_pret_per_user numeric(12, 2)
  generated always as (
    case when coalesce(nr_utilizatori_synergo, 0) > 0
      then round(coalesce(mrr_synergo, 0) / nr_utilizatori_synergo, 0)
      else 0
    end
  ) stored;

-- --- OnPremise: calculate ---

alter table public.opportunities add column licenta_synergo_onpremise numeric(12, 2)
  generated always as (
    round(
      coalesce(pachet_synergo_onpremise, 0) +
      coalesce(licenta_companie_suplimentara, 0) +
      coalesce(licenta_useri_suplimentari_onpremise, 0),
      0
    )
  ) stored;

alter table public.opportunities add column valoare_mentenanta_lunara_onpremise numeric(12, 2)
  generated always as (
    round(coalesce(valoare_mentenanta_per_user_onpremise, 0) * coalesce(nr_utilizatori_synergo, 0), 0)
  ) stored;

-- --- Forecast (comune, dependente de probability) ---

alter table public.opportunities add column forecast_implementare numeric(12, 2)
  generated always as (round(coalesce(valoare_implementare_synergo, 0) * probability, 0)) stored;

alter table public.opportunities add column forecast_licente_onpremise numeric(12, 2)
  generated always as (
    round(
      (
        round(
          coalesce(pachet_synergo_onpremise, 0) +
          coalesce(licenta_companie_suplimentara, 0) +
          coalesce(licenta_useri_suplimentari_onpremise, 0),
          0
        )
      ) * probability,
      0
    )
  ) stored;

alter table public.opportunities add column forecast_mentenanta_onpremise_lunar numeric(12, 2)
  generated always as (
    round(
      (round(coalesce(valoare_mentenanta_per_user_onpremise, 0) * coalesce(nr_utilizatori_synergo, 0), 0)) * probability,
      0
    )
  ) stored;

alter table public.opportunities add column forecast_saas_lunar numeric(12, 2)
  generated always as (
    round(
      (
        round(
          coalesce(valoare_pachet_server_anual, 0) +
          coalesce(valoare_firma_suplimentara, 0) +
          coalesce(mrr_synergo, 0) * 12,
          0
        )
      ) / 12.0 * probability,
      0
    )
  ) stored;

-- Forecast Total SaaS: valabil doar daca exista cel putin o valoare SaaS introdusa
-- (mrr_synergo, valoare_pachet_server_anual sau valoare_firma_suplimentara),
-- exact logica COUNTA(...)=0 din Excel.
alter table public.opportunities add column forecast_total_saas numeric(12, 2)
  generated always as (
    case
      when coalesce(mrr_synergo, 0) = 0
       and coalesce(valoare_pachet_server_anual, 0) = 0
       and coalesce(valoare_firma_suplimentara, 0) = 0
      then null
      else round(
        (round(coalesce(valoare_implementare_synergo, 0) * probability, 0)) +
        (
          round(
            coalesce(valoare_pachet_server_anual, 0) +
            coalesce(valoare_firma_suplimentara, 0) +
            coalesce(mrr_synergo, 0) * 12,
            0
          )
        ) * probability,
        0
      )
    end
  ) stored;

-- Forecast Total OnPremise: valabil doar daca exista cel putin o valoare
-- OnPremise introdusa (pachet, licenta companie, licenta useri suplimentari
-- sau mentenanta per user), exact logica COUNTA(...)=0 din Excel.
alter table public.opportunities add column forecast_total_onpremise numeric(12, 2)
  generated always as (
    case
      when coalesce(pachet_synergo_onpremise, 0) = 0
       and coalesce(licenta_companie_suplimentara, 0) = 0
       and coalesce(licenta_useri_suplimentari_onpremise, 0) = 0
       and coalesce(valoare_mentenanta_per_user_onpremise, 0) = 0
      then null
      else round(
        (round(coalesce(valoare_implementare_synergo, 0) * probability, 0)) +
        (
          round(
            (
              round(
                coalesce(pachet_synergo_onpremise, 0) +
                coalesce(licenta_companie_suplimentara, 0) +
                coalesce(licenta_useri_suplimentari_onpremise, 0),
                0
              )
            ) * probability,
            0
          )
        ) +
        (
          round(
            (round(coalesce(valoare_mentenanta_per_user_onpremise, 0) * coalesce(nr_utilizatori_synergo, 0), 0)) * probability,
            0
          )
        ) * 12,
        0
      )
    end
  ) stored;

-- Reactivam trigger-ul de istoric.
alter table public.opportunities enable trigger trg_record_history;
