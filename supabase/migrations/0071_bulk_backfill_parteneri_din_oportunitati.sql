-- ============================================================================
-- Completare in bloc, o singura data: umple campurile INCA GOALE ale
-- fiecarui Partener cu datele din cea mai veche Oportunitate legata de el
-- (aceleasi campuri care s-au completat manual pe Oportunitati inainte de
-- Faza 4, cand au fost mutate pe Partener). Nu suprascrie niciodata un
-- camp deja completat pe Partener - doar umple golurile (coalesce).
--
-- De la aceasta rulare incolo, orice oportunitate NOUA se leaga automat de
-- partenerul corect chiar la creare (vezi createOpportunityAction), deci
-- acest script e necesar o singura data, pentru istoricul deja existent.
-- ============================================================================

with oldest_opp as (
  select distinct on (partner_id)
    partner_id,
    judet,
    oras,
    domeniul_activitate,
    nr_angajati,
    cifra_afaceri,
    nr_vehicule,
    contact_nume,
    contact_functie,
    contact_telefon,
    contact_email,
    contact2_nume,
    contact2_functie,
    contact2_telefon,
    contact2_email,
    solutia_existenta,
    client_novasoft,
    client_windsoft,
    contabilitate_interna,
    solutie_contabilitate,
    mai_multe_firme_grup,
    nr_societati_suplimentare,
    nume_societati_suplimentare,
    potential_fonduri_europene,
    furnizori_combustibil_1,
    furnizori_combustibil_2,
    furnizori_combustibil_3,
    furnizori_gps_1,
    furnizori_gps_2,
    detalii_suplimentare_software
  from public.opportunities
  where partner_id is not null
  order by partner_id, created_at asc
)
update public.partners p
set
  judet = coalesce(p.judet, o.judet),
  oras = coalesce(p.oras, o.oras),
  domeniul_activitate_id = coalesce(
    p.domeniul_activitate_id,
    (select n.id from public.nomenclatoare n where n.categorie = 'domeniu_activitate' and n.valoare = o.domeniul_activitate limit 1)
  ),
  nr_angajati = coalesce(p.nr_angajati, o.nr_angajati),
  cifra_afaceri = coalesce(p.cifra_afaceri, o.cifra_afaceri),
  nr_vehicule = coalesce(p.nr_vehicule, o.nr_vehicule),
  contact_nume = coalesce(p.contact_nume, o.contact_nume),
  contact_functie = coalesce(p.contact_functie, o.contact_functie),
  contact_telefon = coalesce(p.contact_telefon, o.contact_telefon),
  contact_email = coalesce(p.contact_email, o.contact_email),
  contact2_nume = coalesce(p.contact2_nume, o.contact2_nume),
  contact2_functie = coalesce(p.contact2_functie, o.contact2_functie),
  contact2_telefon = coalesce(p.contact2_telefon, o.contact2_telefon),
  contact2_email = coalesce(p.contact2_email, o.contact2_email),
  solutia_existenta = coalesce(p.solutia_existenta, o.solutia_existenta),
  client_novasoft = p.client_novasoft or coalesce(o.client_novasoft, false),
  client_windsoft = p.client_windsoft or coalesce(o.client_windsoft, false),
  contabilitate_interna = coalesce(p.contabilitate_interna, o.contabilitate_interna),
  solutie_contabilitate = coalesce(p.solutie_contabilitate, o.solutie_contabilitate),
  mai_multe_firme_grup = p.mai_multe_firme_grup or coalesce(o.mai_multe_firme_grup, false),
  nr_societati_suplimentare = coalesce(p.nr_societati_suplimentare, o.nr_societati_suplimentare),
  nume_societati_suplimentare = coalesce(p.nume_societati_suplimentare, o.nume_societati_suplimentare),
  potential_fonduri_europene = p.potential_fonduri_europene or coalesce(o.potential_fonduri_europene, false),
  furnizori_combustibil_1 = coalesce(p.furnizori_combustibil_1, o.furnizori_combustibil_1),
  furnizori_combustibil_2 = coalesce(p.furnizori_combustibil_2, o.furnizori_combustibil_2),
  furnizori_combustibil_3 = coalesce(p.furnizori_combustibil_3, o.furnizori_combustibil_3),
  furnizori_gps_1 = coalesce(p.furnizori_gps_1, o.furnizori_gps_1),
  furnizori_gps_2 = coalesce(p.furnizori_gps_2, o.furnizori_gps_2),
  detalii_suplimentare_software = coalesce(p.detalii_suplimentare_software, o.detalii_suplimentare_software)
from oldest_opp o
where p.id = o.partner_id;
