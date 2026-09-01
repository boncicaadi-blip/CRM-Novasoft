-- ============================================================================
-- Urmarire estimari mutate intre luni, pe Venituri.
--
-- Cand o estimare (de obicei nefacturata) se stie ca se va concretiza in
-- alta luna, se creeaza o linie noua in luna aleasa (cu aceeasi suma,
-- editabila), iar linia originala ramane vizibila la locul ei, marcata ca
-- "mutata" - dar exclusa din totalurile de estimare, ca sa nu se numere de
-- doua ori (sau de N ori, daca se muta in lant).
-- ============================================================================

alter table public.venituri_linii add column if not exists mutat_in_linie_id uuid references public.venituri_linii(id) on delete set null;

comment on column public.venituri_linii.mutat_in_linie_id is
  'Daca e completat, aceasta linie a fost "mutata" catre linia cu acest id (alta luna) - ramane vizibila ca istoric, dar exclusa din totalurile de estimare curente.';

create index if not exists venituri_linii_mutat_in_linie_id_idx on public.venituri_linii (mutat_in_linie_id);
