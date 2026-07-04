-- ============================================================================
-- Stergerea unui contract trebuie sa stearga si liniile de venit generate
-- din el, nu doar sa le "orfanizeze" (contract_id = null). Pana acum FK-ul
-- era ON DELETE SET NULL, ceea ce lasa liniile in urma dupa stergere.
-- ============================================================================

alter table public.venituri_linii drop constraint if exists venituri_linii_contract_id_fkey;
alter table public.venituri_linii
  add constraint venituri_linii_contract_id_fkey
  foreign key (contract_id) references public.contracte(id) on delete cascade;
