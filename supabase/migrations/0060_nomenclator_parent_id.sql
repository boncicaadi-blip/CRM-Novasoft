-- ============================================================================
-- Relatie parinte-copil intre Incadrare si Clasa (Cheltuieli), ca sa respecte
-- structura de Grup -> Linie din P&L. Pana acum erau doua liste independente
-- (orice Clasa putea fi combinata cu orice Incadrare) - acum Clasa poate
-- referi optional o Incadrare parinte, iar formularul de Cheltuieli filtreaza
-- Clasele afisate dupa Incadrarea aleasa.
--
-- Coloana e nullable si generica (self-reference pe nomenclatoare) - nu se
-- foloseste doar pentru Cheltuieli, poate fi reutilizata si pentru alte
-- categorii ierarhice pe viitor, daca apare nevoia.
-- ============================================================================

alter table public.nomenclatoare
  add column if not exists parent_id uuid references public.nomenclatoare(id) on delete set null;

create index if not exists idx_nomenclatoare_parent on public.nomenclatoare (parent_id);

-- ----------------------------------------------------------------------------
-- Mapare Clasa -> Incadrare pentru valorile deja existente. Doar cele
-- neambigue sunt mapate aici; cele cu sens neclar raman fara parinte
-- (parent_id null) si apar in admin ca "neincadrate", ca Adi sa le asigneze
-- manual dupa ce vede lista - mai bine asa decat sa ghicim gresit o
-- clasificare financiara.
-- ----------------------------------------------------------------------------

with incadrari as (
  select valoare, id from public.nomenclatoare where categorie = 'cheltuiala_incadrare'
),
mapari(clasa, incadrare) as (
  values
    ('Salarii nete', 'SALARII'),
    ('Taxe salariale', 'SALARII'),
    ('Beneficii', 'SALARII'),
    ('Bonus performanta', 'SALARII'),
    ('Majorare Taxe', 'SALARII'),
    ('Indexare', 'SALARII'),
    ('Externalizare personal', 'OUTSOURCING'),
    ('Medicina muncii', 'OUTSOURCING'),
    ('SSM', 'OUTSOURCING'),
    ('Contabilitate', 'OUTSOURCING'),
    ('Servicii juridice', 'OUTSOURCING'),
    ('Chirie', 'SPATIU'),
    ('Utilitati', 'SPATIU'),
    ('Cafea + Apa', 'SPATIU'),
    ('Consumabile', 'SPATIU'),
    ('Internet', 'INFRASTRUCTURA IT'),
    ('Telefonie', 'INFRASTRUCTURA IT'),
    ('Hosting servere', 'INFRASTRUCTURA IT'),
    ('Mentenanta servere', 'INFRASTRUCTURA IT'),
    ('Licente', 'INFRASTRUCTURA IT'),
    ('Echipamente hardware', 'INFRASTRUCTURA IT'),
    ('Servicii agentie marketing', 'MARKETING SI PUBLICITATE'),
    ('Servicii externe marketing', 'MARKETING SI PUBLICITATE'),
    ('Servicii marketing', 'MARKETING SI PUBLICITATE'),
    ('Evenimente marketing', 'MARKETING SI PUBLICITATE'),
    ('Evenimente externe', 'MARKETING SI PUBLICITATE'),
    ('Evenimente interne', 'ALTELE'),
    ('Protocol', 'ALTELE'),
    ('Deplasari', 'ALTELE'),
    ('Comisioane', 'ALTELE'),
    ('Administrative', 'ALTELE'),
    ('Piese Auto', 'REGIE AUTO'),
    ('Reparatii Auto', 'REGIE AUTO'),
    ('Asigurari Auto', 'REGIE AUTO'),
    ('Leasinguri Auto', 'REGIE AUTO'),
    ('Impozit pe profit', 'REGIE FIRMA')
    -- Neambigue (raman fara parinte, de asignat manual din Setari -> Nomenclatoare):
    --   'Echipamente'                    (IT sau Spatiu? neclar fara context)
    --   'Costuri ale bunurilor vandute'  (nu exista un Incadrare "COGS" deocamdata)
    --   'Evenimente'                     (Marketing sau Altele? neclar)
    --   'Planificat'                     (nu corespunde unei categorii clare)
)
update public.nomenclatoare c
set parent_id = i.id
from mapari m
join incadrari i on i.valoare = m.incadrare
where c.categorie = 'cheltuiala_clasa' and c.valoare = m.clasa;
