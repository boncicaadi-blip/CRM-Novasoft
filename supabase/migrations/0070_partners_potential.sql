-- Adauga distinctia "Potential" (prospect/lead, inca nu client si nu
-- furnizor) pe langa Client (facturabil) si Furnizor (este_furnizor) - ajuta
-- la diferentierea rapida a partenerilor in lista.
alter table public.partners add column if not exists potential boolean not null default false;

comment on column public.partners.potential is
  'Partener potential (prospect/lead) - independent de Client (facturabil) si Furnizor (este_furnizor); poate fi bifat impreuna cu oricare din ele.';
