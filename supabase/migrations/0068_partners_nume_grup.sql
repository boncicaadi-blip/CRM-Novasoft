-- ============================================================================
-- Adauga gruparea de firme (ex. "MARA" contine MARA LOGISTIC QUALITY,
-- EXPRESS, RIMAD) direct pe partener - independent de opportunities.nume_grup,
-- care nu exista pentru toate firmele (unele nu au nicio oportunitate CRM).
-- Folosit in Dashboard Creante si Dashboard Venituri, la "Top Clienti" -
-- daca partenerul are un grup completat, intra in raport sub numele grupului,
-- nu individual.
-- ============================================================================

alter table public.partners add column if not exists nume_grup text;

comment on column public.partners.nume_grup is
  'Grupul de firme din care face parte partenerul (ex. mai multe firme separate, aceeasi familie/grup economic) - folosit pentru agregare in Dashboard Creante/Venituri.';

create index if not exists partners_nume_grup_idx on public.partners (nume_grup);
