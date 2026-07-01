-- ============================================================================
-- B-18: rezumatul AI generat pe o oportunitate se salveaza acum ca intrare
-- de timeline (tip nou 'ai_rezumat'), ca sa ramana istoric - fiecare
-- generare noua adauga o intrare noua, nu suprascrie una veche.
-- ============================================================================

alter table public.opportunity_timeline drop constraint if exists opportunity_timeline_tip_check;
alter table public.opportunity_timeline add constraint opportunity_timeline_tip_check check (tip in (
  'nota', 'call', 'email', 'demo', 'oferta_trimisa', 'follow_up',
  'schimbare_stage', 'schimbare_status', 'actiune_finalizata', 'actiune_setata',
  'creare', 'ai_rezumat'
));
