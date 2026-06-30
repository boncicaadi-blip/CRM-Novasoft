-- ============================================================================
-- A doua persoana de contact pe oportunitate (maxim 2, cf. cerinta).
-- ============================================================================

alter table public.opportunities
  add column if not exists contact2_nume text,
  add column if not exists contact2_functie text,
  add column if not exists contact2_telefon text,
  add column if not exists contact2_email text;
