-- ============================================================================
-- Extinde partners cu un flag simetric lui "facturabil" (client), pentru
-- partea de furnizor - un partener poate fi client (facturabil), furnizor
-- (este_furnizor), sau ambele. Folosit pentru dropdown-ul de furnizori la
-- adaugarea manuala de Obligatii, la fel cum "facturabil" alimenteaza deja
-- dropdown-ul de clienti la Creante/Venituri.
-- ============================================================================

alter table public.partners add column if not exists este_furnizor boolean not null default false;

comment on column public.partners.este_furnizor is
  'True daca partenerul apare ca optiune de furnizor la adaugarea manuala de Obligatii (simetric cu "facturabil" pentru Creante/Venituri).';
