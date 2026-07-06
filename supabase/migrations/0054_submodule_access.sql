-- ============================================================================
-- Drepturi la nivel de SUBMODUL, nu doar de modul intreg. Un user poate
-- primi acces la tot modulul "Financiar" (ca acum), SAU doar la anumite
-- submodule ale lui (ex: doar Venituri, sau doar Dashboard Venituri),
-- fara sa aiba acces la restul (Cheltuieli, Contracte etc).
--
-- module_access ramane cum era - acces total la un modul intreg.
-- submodule_access e nou - chei punctate, gen "venituri_cheltuieli.venituri".
-- Daca userul are modulul intreg in module_access, are automat acces la
-- toate submodulele lui (nu trebuie bifate separat).
-- ============================================================================

alter table public.profiles add column if not exists submodule_access text[] not null default '{}';

comment on column public.profiles.submodule_access is 'Chei de submodul (ex: venituri_cheltuieli.venituri) - acces partial la un modul, fara acces la modulul intreg. Ignorat daca userul are deja modulul parinte in module_access.';
