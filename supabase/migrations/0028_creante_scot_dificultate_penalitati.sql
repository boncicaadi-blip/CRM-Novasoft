-- ============================================================================
-- Grad dificultate incasare si penalitatile de intarziere nu se mai
-- completeaza manual per factura - vor fi tratate la nivel de client,
-- probabil printr-o interpretare automata bazata pe istoric (fisa client),
-- nu ca un camp editabil pe fiecare rand.
-- ============================================================================

alter table public.creante drop column if exists grad_dificultate_incasare;
alter table public.creante drop column if exists procent_penalitate_intarziere;
alter table public.creante drop column if exists valoare_penalitati_intarziere;
