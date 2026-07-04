-- ============================================================================
-- Import target istoric de incasare (Creante), din exportul Power BI al
-- utilizatorului - decembrie 2024 pana in iunie 2026 (luni deja incheiate).
--
-- Nu atinge luna curenta (calculata automat din facturile propuse) - toate
-- lunile de mai jos sunt deja trecute. Foloseste on conflict pentru
-- siguranta, in caz ca migrarea se ruleaza de mai multe ori.
-- ============================================================================

insert into public.creante_targets_lunare (luna, target)
values
  ('2024-12', 397832.0),
  ('2025-01', 387712.0),
  ('2025-02', 367159.0),
  ('2025-03', 505800.0),
  ('2025-04', 358257.0),
  ('2025-05', 376900.0),
  ('2025-06', 379643.0),
  ('2025-07', 355637.0),
  ('2025-08', 513773.0),
  ('2025-09', 431433.0),
  ('2025-10', 614810.0),
  ('2025-11', 268314.0),
  ('2025-12', 748444.0),
  ('2026-01', 433536.0),
  ('2026-02', 421873.0),
  ('2026-03', 568475.0),
  ('2026-04', 372139.0),
  ('2026-05', 434157.0),
  ('2026-06', 643888.0)
on conflict (luna) do update set target = excluded.target, actualizat_la = now();
