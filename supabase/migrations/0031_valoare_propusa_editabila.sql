-- ============================================================================
-- "Propus spre incasare/plata" nu mai inseamna automat soldul integral al
-- facturii. Se poate propune o valoare partiala (ex: factura de 1000 lei,
-- dar propui doar 500 spre incasare luna asta). La bifare, valoarea se
-- initializeaza cu soldul integral - de-acolo se poate edita in jos, din
-- fisa facturii.
-- ============================================================================

alter table public.creante add column if not exists valoare_propusa_spre_incasare numeric(12, 2);
comment on column public.creante.valoare_propusa_spre_incasare is 'Valoare propusa spre incasare - initial egala cu soldul, editabila manual mai jos de atat. Relevanta doar cand propus_spre_incasare = true.';

alter table public.obligatii add column if not exists valoare_propusa_spre_plata numeric(12, 2);
comment on column public.obligatii.valoare_propusa_spre_plata is 'Valoare propusa spre plata - initial egala cu soldul, editabila manual mai jos de atat. Relevanta doar cand propus_spre_plata = true.';
