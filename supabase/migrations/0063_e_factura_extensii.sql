-- ============================================================================
-- Extinderi pentru integrarea E-Factura:
--   1. anaf_facturi: adauga data_scadenta si serviciu (extrase acum din XML)
--   2. creante/obligatii: adauga cif_client/cif_furnizor, ca partenerii sa
--      poata fi identificati/unificati dupa CIF, nu doar dupa nume
--   3. Nomenclator nou: modalitate de plata (Card/Numerar/Virament), pentru
--      Obligatii - inlocuieste campul de text liber
--   4. Normalizare unica (o singura data): toate numele de firme/furnizori
--      existente sunt convertite la MAJUSCULE, ca sa fie consistente
--      indiferent cum au fost scrise la import (Excel sau ANAF)
-- ============================================================================

alter table public.anaf_facturi add column if not exists data_scadenta date;
alter table public.anaf_facturi add column if not exists serviciu text;

alter table public.creante add column if not exists cif_client text;
alter table public.obligatii add column if not exists cif_furnizor text;

create index if not exists idx_creante_cif_client on public.creante (cif_client);
create index if not exists idx_obligatii_cif_furnizor on public.obligatii (cif_furnizor);

-- ----------------------------------------------------------------------------
-- Nomenclator: modalitate plata (Obligatii) - Card / Numerar / Virament.
-- ----------------------------------------------------------------------------

insert into public.nomenclatoare (categorie, valoare, ordine, activ)
select 'obligatie_modalitate_plata', v, o, true
from (values ('Virament', 1), ('Card', 2), ('Numerar', 3)) as t(v, o)
where not exists (
  select 1 from public.nomenclatoare
  where categorie = 'obligatie_modalitate_plata' and valoare = t.v
);

-- ----------------------------------------------------------------------------
-- Normalizare unica a numelor existente - de aici incolo, orice nume nou
-- (manual sau din sincronizarea ANAF) e normalizat automat de aplicatie, nu
-- mai e nevoie sa se repete acest pas.
-- ----------------------------------------------------------------------------

update public.creante set nume_firma = upper(trim(nume_firma)) where nume_firma <> upper(trim(nume_firma));
update public.obligatii set nume_furnizor = upper(trim(nume_furnizor)) where nume_furnizor <> upper(trim(nume_furnizor));
