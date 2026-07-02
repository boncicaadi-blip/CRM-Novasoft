-- ============================================================================
-- Restructurare Creante dupa primul feedback real de utilizare:
-- - Scoatem complet "Datorie operationala" / "Departament" - nefolosite.
-- - Adaugam "Tip Vanzare" (Recurente/Nerecurente) - vine din fisierul de
--   backfill; la importurile viitoare (formatul brut din facturare) nu
--   exista in sursa, ramane null pana e completat manual.
-- - Inlocuim "Data tinta de incasare" (camp de data, greu de completat pe
--   fiecare factura) cu "Propus spre incasare" - o simpla bifa, mult mai
--   rapid de bifat in lista, folosita pentru a defini targetul lunar de
--   incasari.
-- ============================================================================

alter table public.creante drop column if exists datorie_operationala;
alter table public.creante drop column if exists departament_datorie_operationala;

alter table public.creante add column if not exists tip_vanzare text
  check (tip_vanzare is null or tip_vanzare in ('Recurente', 'Nerecurente'));

alter table public.creante add column if not exists propus_spre_incasare boolean not null default false;

comment on column public.creante.propus_spre_incasare is 'Bifa manuala: factura e propusa pentru incasare in perioada curenta - baza pentru targetul de incasari.';
