-- ============================================================================
-- Valori de nomenclator gasite in importul istoric de Venituri, care lipseau
-- din seed-ul initial.
-- ============================================================================

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('venit_produs', 'HARDWARE', 9)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('venit_serviciu', 'HARDWARE', 9),
  ('venit_serviciu', 'LICENTA', 10)
on conflict (categorie, valoare) do nothing;
