-- ============================================================================
-- Drepturi per-utilizator la nivel de modul mare (CRM / Creante & Obligatii /
-- Venituri & Cheltuieli). Pentru moment doar la nivel de modul intreg -
-- granularitate pe submodule vine mai tarziu.
--
-- Adminii au mereu acces la tot, indiferent de continutul acestui camp
-- (verificat in cod, nu aici) - campul conteaza doar pentru useri non-admin.
-- Default 'crm' pentru toti userii existenti, ca sa nu piarda acces la ce
-- foloseau deja.
-- ============================================================================

alter table public.profiles add column if not exists module_access text[] not null default '{crm}';

comment on column public.profiles.module_access is 'Module mari la care are acces userul (crm, creante_obligatii, venituri_cheltuieli) - irelevant pentru admin, care are mereu acces la tot.';
