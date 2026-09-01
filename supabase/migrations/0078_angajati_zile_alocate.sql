-- Zilele de concediu la care are dreptul un angajat, standard, pe an (ex.
-- 21) - traiesc acum pe angajat, nu doar ca override per-an in
-- concedii_sold. concedii_sold ramane disponibil pentru un an specific in
-- care vrei sa suprascrii valoarea standard (ex. un bonus special), dar
-- implicit se foloseste aceasta valoare, nu un "21" fix pentru toata lumea.
alter table public.angajati add column if not exists zile_alocate_an numeric(5, 1) not null default 21;

comment on column public.angajati.zile_alocate_an is
  'Zilele de concediu de odihna la care are dreptul angajatul, standard, pe an intreg lucrat (inainte de proratare pentru anul angajarii/incetarii).';
