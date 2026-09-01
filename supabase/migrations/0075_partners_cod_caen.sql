-- Adauga codul CAEN (cod de activitate) pe Partener - preluat automat de la
-- ANAF (acelasi serviciu care aduce judet/oras). Doar codul numeric - o
-- lista completa si corecta de denumiri CAEN (Rev.3, in vigoare din
-- ianuarie 2025) ramane un pas separat, de facut cu atentie, ca sa nu
-- introducem denumiri gresite sau din revizia veche (Rev.2).
alter table public.partners add column if not exists cod_caen text;

comment on column public.partners.cod_caen is
  'Codul CAEN al activitatii principale, preluat de la ANAF - doar codul numeric, fara denumire (vezi nota din migratie).';
