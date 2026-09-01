-- Permite adminului sa controleze, per utilizator, daca vede popup-ul cu
-- rezumatul zilnic (actiuni de azi/intarziate) la deschiderea aplicatiei.
alter table public.profiles add column if not exists arata_popup_zilnic boolean not null default true;

comment on column public.profiles.arata_popup_zilnic is
  'Daca e false, popup-ul cu rezumatul zilnic (actiuni de azi/intarziate) nu se mai afiseaza deloc pentru acest utilizator, indiferent de sesiune.';
