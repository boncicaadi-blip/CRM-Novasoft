-- ============================================================================
-- Faza 3 din restructurarea CRM: partenerul devine identitatea unica si
-- stabila a firmei; oportunitatea devine doar "un deal", legat de partener.
--
-- 1. opportunities.partner_id - FK lipsa pana acum. Fara ea, un partener nu
--    putea fi legat de MAI MULTE oportunitati in mod fiabil (doar
--    partners.opportunity_id, o singura legatura, cea gasita ultima data la
--    sincronizare). Cu acest FK, "SELECT * FROM opportunities WHERE
--    partner_id = X" arata toate oportunitatile (istorice + active) ale
--    unui partener.
--
-- 2. partners: campuri "la nivel de firma" - mutate aici de pe oportunitate
--    (domeniu, judet/oras, cifra afaceri, contacte, calificare tehnica
--    generala). Raman pe oportunitate doar cele specifice negocierii
--    (produs propus, interes planificator) - Faza 4.
-- ============================================================================

alter table public.opportunities add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists opportunities_partner_id_idx on public.opportunities (partner_id);

-- ----------------------------------------------------------------------------
-- Campuri noi pe partners (nivel firma, stabile indiferent de oportunitate)
-- ----------------------------------------------------------------------------

alter table public.partners add column if not exists domeniul_activitate_id uuid references public.nomenclatoare(id);
alter table public.partners add column if not exists judet text;
alter table public.partners add column if not exists oras text;
alter table public.partners add column if not exists cifra_afaceri numeric(14, 2);
alter table public.partners add column if not exists nr_angajati integer;
alter table public.partners add column if not exists cifra_afaceri_an integer;
alter table public.partners add column if not exists cifra_afaceri_actualizat_la date;
alter table public.partners add column if not exists nr_vehicule integer;

alter table public.partners add column if not exists contact_nume text;
alter table public.partners add column if not exists contact_functie text;
alter table public.partners add column if not exists contact_telefon text;
alter table public.partners add column if not exists contact_email text;
alter table public.partners add column if not exists contact2_nume text;
alter table public.partners add column if not exists contact2_functie text;
alter table public.partners add column if not exists contact2_telefon text;
alter table public.partners add column if not exists contact2_email text;

alter table public.partners add column if not exists solutia_existenta text;
alter table public.partners add column if not exists client_novasoft boolean not null default false;
alter table public.partners add column if not exists client_windsoft boolean not null default false;
alter table public.partners add column if not exists contabilitate_interna text;
alter table public.partners add column if not exists solutie_contabilitate text;
alter table public.partners add column if not exists mai_multe_firme_grup boolean not null default false;
alter table public.partners add column if not exists nr_societati_suplimentare integer;
alter table public.partners add column if not exists nume_societati_suplimentare text;
alter table public.partners add column if not exists potential_fonduri_europene boolean not null default false;
alter table public.partners add column if not exists furnizori_combustibil_1 text;
alter table public.partners add column if not exists furnizori_combustibil_2 text;
alter table public.partners add column if not exists furnizori_combustibil_3 text;
alter table public.partners add column if not exists furnizori_gps_1 text;
alter table public.partners add column if not exists furnizori_gps_2 text;
alter table public.partners add column if not exists detalii_suplimentare_software text;

comment on column public.partners.domeniul_activitate_id is 'Mutat de pe oportunitate (Faza 3 - fisa partenerului) - date la nivel de firma, nu de negociere.';
