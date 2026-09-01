-- Campuri suplimentare pe partener, necesare pentru generarea de contracte
-- (Modul Contracte) - adresa completa, date de inregistrare si
-- reprezentantul legal (diferit de contactul comercial existent).

alter table public.partners add column if not exists adresa text;
alter table public.partners add column if not exists reg_com text;
alter table public.partners add column if not exists forma_juridica text;
alter table public.partners add column if not exists atribut_fiscal text not null default 'RO';
alter table public.partners add column if not exists reprezentant_nume text;
alter table public.partners add column if not exists reprezentant_functie text;

comment on column public.partners.adresa is 'Adresa completa (strada, numar) - judet/oras sunt deja campuri separate.';
comment on column public.partners.reg_com is 'Numarul de inregistrare la Registrul Comertului (ex. J40/1234/2020).';
comment on column public.partners.forma_juridica is 'Forma juridica (SRL, SA, PFA etc.) - de obicei diferita de "nume", desi uneori inclusa in el.';
comment on column public.partners.reprezentant_nume is 'Reprezentantul legal (pentru semnatura contractelor) - diferit de contact_nume, care e contactul comercial.';
comment on column public.partners.reprezentant_functie is 'Functia reprezentantului legal (ex. Administrator, Director General).';
