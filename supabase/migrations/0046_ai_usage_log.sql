-- ============================================================================
-- Jurnal de consum AI (Claude) - o linie per apel catre API-ul Anthropic,
-- indiferent daca a reusit sau nu (un apel esuat tot consuma tokeni si
-- costa bani - trebuie contorizat la fel). Vizibil doar adminului, din
-- Setari -> Consum AI.
-- ============================================================================

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  thinking_tokens integer not null default 0,
  success boolean not null default true,
  user_id uuid references public.profiles(id) on delete set null,
  creat_la timestamptz not null default now()
);

comment on table public.ai_usage_log is 'O linie per apel catre Claude - feature (ex: creante_insight), model, tokeni, succes/esec. Folosit pentru raportul de consum AI din Setari, vizibil doar adminului.';

create index if not exists ai_usage_log_creat_la_idx on public.ai_usage_log (creat_la);
create index if not exists ai_usage_log_feature_idx on public.ai_usage_log (feature);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage_log_admin_read" on public.ai_usage_log;
create policy "ai_usage_log_admin_read" on public.ai_usage_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_usage_log_insert" on public.ai_usage_log;
create policy "ai_usage_log_insert" on public.ai_usage_log
  for insert with check (auth.uid() is not null);
