-- ============================================================================
-- Persoana de contact pe oportunitate (nume, functie, telefon, email).
-- Cf. roadmap sectiunea "Contacte": o firma poate avea mai multe contacte
-- in viitor, dar pentru aceasta etapa pastram un singur contact principal
-- direct pe oportunitate (simplu, suficient pentru nevoia curenta).
-- ============================================================================

alter table public.opportunities
  add column if not exists contact_nume text,
  add column if not exists contact_functie text,
  add column if not exists contact_telefon text,
  add column if not exists contact_email text;
