-- ============================================================================
-- Istoric de interpretari AI - de fiecare data cand se genereaza cu succes
-- o interpretare (Creante, Venituri, CRM, Raport Comercial), textul se
-- pastreaza aici, ca sa poti vedea in timp cum a evoluat analiza, nu doar
-- ultima generare.
-- ============================================================================

create table if not exists public.ai_insights_history (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  rezumat text not null,
  riscuri text not null,
  recomandari text not null,
  creat_de uuid references public.profiles(id) on delete set null,
  creat_la timestamptz not null default now()
);

comment on table public.ai_insights_history is 'Istoric de interpretari AI generate cu succes, per feature (dashboard).';

create index if not exists ai_insights_history_feature_idx on public.ai_insights_history (feature, creat_la desc);

alter table public.ai_insights_history enable row level security;

drop policy if exists "ai_insights_history_admin_read" on public.ai_insights_history;
create policy "ai_insights_history_admin_read" on public.ai_insights_history
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_insights_history_insert" on public.ai_insights_history;
create policy "ai_insights_history_insert" on public.ai_insights_history
  for insert with check (auth.uid() is not null);
