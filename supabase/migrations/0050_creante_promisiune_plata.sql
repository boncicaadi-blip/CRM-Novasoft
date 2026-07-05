-- ============================================================================
-- Promisiune de plata - lightweight, deliberat: doar suma si data promisa,
-- fara flux de aprobare/disputa/juridic. Scopul e sa vezi dintr-o privire
-- ce ti-a promis clientul, nu sa construim un modul separat.
-- ============================================================================

alter table public.creante add column if not exists data_promisa date;
alter table public.creante add column if not exists suma_promisa numeric(12, 2);

comment on column public.creante.data_promisa is 'Data la care clientul a promis ca plateste - informativ, fara flux separat.';
comment on column public.creante.suma_promisa is 'Suma promisa - poate fi mai mica decat soldul (promisiune partiala).';
