-- ============================================================================
-- Responsabil pe ACTIUNE - separat de responsabilul de vanzare al
-- oportunitatii (care poate fi altcineva). Implicit vine userul logat care
-- creeaza/editeaza actiunea, dar poate fi realocat oricui.
-- ============================================================================

alter table public.opportunities add column if not exists responsabil_actiune_id uuid references public.profiles(id);

create index if not exists idx_opportunities_responsabil_actiune on public.opportunities (responsabil_actiune_id);

comment on column public.opportunities.responsabil_actiune_id is 'Responsabilul actiunii curente (actiune/data_actiune) - implicit userul care a creat-o, realocabil.';
