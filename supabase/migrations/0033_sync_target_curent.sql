-- ============================================================================
-- Targetul nu se mai seteaza manual - se calculeaza automat din facturile
-- deja bifate "Propus spre incasare". Rulam o sincronizare unica acum, ca
-- sa nu astepti pana la urmatoarea bifare/editare pentru ca targetul lunii
-- curente sa reflecte corect ce ai bifat deja.
-- ============================================================================

insert into public.creante_targets_lunare (luna, target)
select
  to_char(current_date, 'YYYY-MM'),
  coalesce(sum(coalesce(valoare_propusa_spre_incasare, sold)), 0)
from public.creante
where propus_spre_incasare = true and sold > 0
on conflict (luna) do update set target = excluded.target, actualizat_la = now();

insert into public.obligatii_targets_lunare (luna, target)
select
  to_char(current_date, 'YYYY-MM'),
  coalesce(sum(coalesce(valoare_propusa_spre_plata, sold)), 0)
from public.obligatii
where propus_spre_plata = true and sold > 0
on conflict (luna) do update set target = excluded.target, actualizat_la = now();
