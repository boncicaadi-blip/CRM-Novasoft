-- ============================================================================
-- Raport Comercial (B-13, prima parte): KPI-uri agregate tip Power BI.
--
-- 1. company_settings: tabel singleton (un singur rand, id=1) cu targetul
--    comercial, folosit pentru Pipeline Coverage. Editabil doar de admin.
--
-- 2. get_pipeline_snapshot_at(target_date): reconstruieste valorile de
--    pipeline/forecast asa cum erau la o data din trecut, folosind coloana
--    `snapshot` (jsonb, intregul rand la momentul respectiv) din
--    opportunity_history. Pentru fiecare oportunitate, ia cel mai recent
--    snapshot de dinainte de target_date si aplica aceleasi reguli de
--    business ca varianta curenta (activ = status 'Activa' si stage diferit
--    de 'Lead Pool').
-- ============================================================================

create table if not exists public.company_settings (
  id smallint primary key default 1,
  target_comercial numeric(12, 2),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  constraint company_settings_singleton check (id = 1)
);

insert into public.company_settings (id, target_comercial)
values (1, null)
on conflict (id) do nothing;

alter table public.company_settings enable row level security;

drop policy if exists "company_settings_select_authenticated" on public.company_settings;
create policy "company_settings_select_authenticated" on public.company_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "company_settings_update_admin" on public.company_settings;
create policy "company_settings_update_admin" on public.company_settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

comment on table public.company_settings is 'Setari globale ale companiei - un singur rand (id=1). Momentan doar targetul comercial, pentru Pipeline Coverage.';

-- ----------------------------------------------------------------------------

create or replace function public.get_pipeline_snapshot_at(target_date timestamptz)
returns table (
  pipeline_activ_saas numeric,
  pipeline_activ_onprem numeric,
  pipeline_activ_implementare numeric,
  forecast_total_saas numeric,
  forecast_total_onpremise numeric
)
language sql
stable
security invoker
as $$
  with latest_snapshot as (
    select distinct on (opportunity_id)
      opportunity_id, snapshot
    from public.opportunity_history
    where snapshot_date <= target_date
    order by opportunity_id, snapshot_date desc
  )
  select
    coalesce(sum(case
      when (snapshot->>'status') = 'Activa' and (snapshot->>'stage') <> 'Lead Pool'
        and (snapshot->>'pricing_mode') = 'saas'
      then (snapshot->>'arr_synergo')::numeric else 0 end), 0) as pipeline_activ_saas,
    coalesce(sum(case
      when (snapshot->>'status') = 'Activa' and (snapshot->>'stage') <> 'Lead Pool'
        and (snapshot->>'pricing_mode') = 'onpremise'
      then (snapshot->>'licenta_synergo_onpremise')::numeric else 0 end), 0) as pipeline_activ_onprem,
    coalesce(sum(case
      when (snapshot->>'status') = 'Activa' and (snapshot->>'stage') <> 'Lead Pool'
      then (snapshot->>'valoare_implementare_synergo')::numeric else 0 end), 0) as pipeline_activ_implementare,
    coalesce(sum(case
      when (snapshot->>'status') = 'Activa' and (snapshot->>'stage') <> 'Lead Pool'
      then (snapshot->>'forecast_total_saas')::numeric else 0 end), 0) as forecast_total_saas,
    coalesce(sum(case
      when (snapshot->>'status') = 'Activa' and (snapshot->>'stage') <> 'Lead Pool'
      then (snapshot->>'forecast_total_onpremise')::numeric else 0 end), 0) as forecast_total_onpremise
  from latest_snapshot;
$$;

comment on function public.get_pipeline_snapshot_at is 'Reconstruieste totalurile de pipeline/forecast la o data din trecut, din coloana snapshot (jsonb) a opportunity_history. Folosit pentru Pipeline Delta / Forecast Delta fata de saptamana anterioara.';
