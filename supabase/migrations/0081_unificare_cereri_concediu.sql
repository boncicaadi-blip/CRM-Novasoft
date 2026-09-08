-- PAS 2 - uneste efectiv cererile de concediu de odihna care, pentru
-- acelasi angajat, sunt legate consecutiv cu doar un weekend intre ele
-- (ex. 22.07-26.07 + 29.07-31.07 devine o singura cerere 22.07-31.07).
--
-- Ruleaza scripts/preview_unificare_cereri_concediu.sql INAINTE de asta,
-- ca sa vezi exact ce se va uni.
--
-- Sigur de rulat de mai multe ori (daca nu mai gaseste nimic de unit, nu
-- schimba nimic).

do $$
declare
  r record;
  angajat_curent uuid := null;
  lant_id uuid;
  lant_inceput date;
  lant_sfarsit date;
  lant_zile numeric;
  ids_de_sters uuid[] := array[]::uuid[];
  nr_unite int := 0;
begin
  for r in (
    select id, angajat_id, data_inceput, data_sfarsit, nr_zile
    from public.concedii_cereri
    where tip = 'concediu_odihna' and status = 'aprobat'
    order by angajat_id, data_inceput
  ) loop
    if angajat_curent is null or angajat_curent <> r.angajat_id then
      if lant_id is not null and coalesce(array_length(ids_de_sters, 1), 0) > 0 then
        update public.concedii_cereri
        set data_inceput = lant_inceput, data_sfarsit = lant_sfarsit, nr_zile = lant_zile
        where id = lant_id;
        delete from public.concedii_cereri where id = any(ids_de_sters);
        nr_unite := nr_unite + array_length(ids_de_sters, 1);
      end if;

      angajat_curent := r.angajat_id;
      lant_id := r.id;
      lant_inceput := r.data_inceput;
      lant_sfarsit := r.data_sfarsit;
      lant_zile := r.nr_zile;
      ids_de_sters := array[]::uuid[];
    else
      if r.data_inceput > lant_sfarsit
        and r.data_inceput - lant_sfarsit <= 3
        and not exists (
          select 1 from generate_series(lant_sfarsit + 1, r.data_inceput - 1, interval '1 day') d
          where extract(dow from d) not in (0, 6)
        )
      then
        lant_sfarsit := r.data_sfarsit;
        lant_zile := lant_zile + r.nr_zile;
        ids_de_sters := array_append(ids_de_sters, r.id);
      else
        if coalesce(array_length(ids_de_sters, 1), 0) > 0 then
          update public.concedii_cereri
          set data_inceput = lant_inceput, data_sfarsit = lant_sfarsit, nr_zile = lant_zile
          where id = lant_id;
          delete from public.concedii_cereri where id = any(ids_de_sters);
          nr_unite := nr_unite + array_length(ids_de_sters, 1);
        end if;

        lant_id := r.id;
        lant_inceput := r.data_inceput;
        lant_sfarsit := r.data_sfarsit;
        lant_zile := r.nr_zile;
        ids_de_sters := array[]::uuid[];
      end if;
    end if;
  end loop;

  if lant_id is not null and coalesce(array_length(ids_de_sters, 1), 0) > 0 then
    update public.concedii_cereri
    set data_inceput = lant_inceput, data_sfarsit = lant_sfarsit, nr_zile = lant_zile
    where id = lant_id;
    delete from public.concedii_cereri where id = any(ids_de_sters);
    nr_unite := nr_unite + array_length(ids_de_sters, 1);
  end if;

  raise notice 'Cereri unificate (randuri sterse ca duplicat): %', nr_unite;
end $$;
