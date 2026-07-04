-- ============================================================================
-- "Facturabil" pe oportunitate - independent de stage. Rezolva cazul in care
-- aceeasi firma are mai multe vanzari/oportunitati, dar nu toate trec printr-
-- un flux nou complet de pipeline (ex: un up-sell tratat direct, fara sa
-- "treaca prin oportunitate"). Selectorul de client din Contracte (Venituri)
-- foloseste acest camp, nu stage-ul.
-- ============================================================================

alter table public.opportunities add column if not exists facturabil boolean not null default false;

comment on column public.opportunities.facturabil is 'Bifat manual cand aceasta oportunitate reprezinta un client/vanzare reala, facturabila - controleaza daca apare in selectorul de client la Contracte (Venituri). Independent de stage.';
