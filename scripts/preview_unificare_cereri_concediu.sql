-- PAS 1 (doar previzualizare, nu schimba nimic) - ruleaza asta primul, ca
-- sa vezi exact ce lanturi de cereri ar urma sa fie unite, inainte sa
-- rulezi scriptul de unificare efectiva (0081_unificare_cereri_concediu.sql).
--
-- Regula de unificare: doua cereri de "concediu de odihna", pentru acelasi
-- angajat, se unesc daca intervalul dintre ele este format EXCLUSIV din
-- zile de weekend (sambata/duminica) - adica erau, de fapt, o singura
-- cerere continua, doar ca weekendul dintre ele nu era marcat separat.
--
-- Limitare cunoscuta: daca intervalul dintre doua cereri include si o
-- sarbatoare legala (nu doar weekend), scriptul NU le uneste automat -
-- verifica manual, separat, daca gasesti astfel de cazuri in lista de mai
-- jos (ar trebui sa fie rare).

with candidati as (
  select
    id,
    angajat_id,
    data_inceput,
    data_sfarsit,
    nr_zile,
    lag(data_sfarsit) over (partition by angajat_id order by data_inceput) as sfarsit_anterior,
    lag(id) over (partition by angajat_id order by data_inceput) as id_anterior
  from public.concedii_cereri
  where tip = 'concediu_odihna' and status = 'aprobat'
)
select
  a.nume as angajat,
  c.id_anterior,
  c.sfarsit_anterior as sfarsit_cerere_anterioara,
  c.id as id_cerere_curenta,
  c.data_inceput as inceput_cerere_curenta,
  c.data_sfarsit,
  c.nr_zile
from candidati c
join public.angajati a on a.id = c.angajat_id
where c.sfarsit_anterior is not null
  and c.data_inceput > c.sfarsit_anterior
  and c.data_inceput - c.sfarsit_anterior <= 3
  and not exists (
    select 1 from generate_series(c.sfarsit_anterior + 1, c.data_inceput - 1, interval '1 day') d
    where extract(dow from d) not in (0, 6)
  )
order by a.nume, c.data_inceput;
