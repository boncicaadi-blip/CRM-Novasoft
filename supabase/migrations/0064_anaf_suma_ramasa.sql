-- ============================================================================
-- Adauga suma_ramasa_de_plata pe anaf_facturi - permite detectarea facturilor
-- deja achitate integral la emitere (bonuri fiscale/POS, ex. LIDL), unde
-- XML-ul UBL raporteaza PayableAmount=0 desi factura are o valoare reala
-- (TaxInclusiveAmount). Folosit la import: daca suma ramasa e 0, factura se
-- marcheaza automat ca incasata/platita integral, cu data scadentei = data
-- facturii (nu exista termen real de plata pentru o achizitie instant).
-- ============================================================================

alter table public.anaf_facturi add column if not exists suma_ramasa_de_plata numeric(12, 2);
