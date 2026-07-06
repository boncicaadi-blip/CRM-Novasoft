-- ============================================================================
-- 0. Constrangerea originala "valoare > 0" pe jurnalul de incasari nu
--    permitea NICIODATA o valoare negativa - corect pentru incasari normale,
--    dar gresit pentru facturile de stornare (credit note, total negativ),
--    unde o corectie CORECTA e tot negativa (ca sa aduca soldul negativ
--    inapoi la 0). O relaxam la "diferit de 0" - zero tot nu are sens
--    (n-ai ce sa inregistrezi).
-- ============================================================================

alter table public.creante_incasari drop constraint if exists creante_incasari_valoare_check;
alter table public.creante_incasari add constraint creante_incasari_valoare_check check (valoare <> 0);

-- ============================================================================
-- Fix pentru 2 facturi de stornare (total negativ) care au ramas cu sold
-- negativ desi erau de fapt rezolvate - cauza exacta: la import, clamp-ul
-- vechi pe Rest Incasare Fact nu gestiona corect facturile cu total negativ
-- (vezi si fix-ul de cod aferent, in actions/creante.ts). Adaugam o
-- inregistrare corectiva in jurnalul de incasari, care aduce soldul la 0,
-- pentru fiecare din cele 2 facturi cunoscute.
-- ============================================================================

insert into public.creante_incasari (creanta_id, valoare, data_incasare, observatie)
select id, sold, current_date, 'Corectie manuala - factura de stornare, sold ramas gresit din cauza unui bug de import (rezolvat)'
from public.creante
where nr_factura in ('1002666', '1002738') and sold != 0;
