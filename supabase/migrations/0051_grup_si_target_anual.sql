-- ============================================================================
-- 1. Grup pe parteneri - din fisa oportunitatii (nume_grup), ca sa putem
--    face analize la nivel de grup de firme, nu doar per firma individuala.
-- ============================================================================

alter table public.partners add column if not exists nume_grup text;

update public.partners p
set nume_grup = o.nume_grup
from public.opportunities o
where p.opportunity_id = o.id and p.nume_grup is null;

-- ============================================================================
-- 2. Target comercial setat PE AN, nu un singur numar global - avand
--    istoricul importat, se poate seta si retroactiv pentru anii anteriori,
--    ca sa te poti raporta la ei.
-- ============================================================================

create table if not exists public.target_comercial_anual (
  an integer primary key,
  target numeric(14, 2) not null default 0,
  actualizat_la timestamptz not null default now()
);

comment on table public.target_comercial_anual is 'Target comercial anual, per an - inlocuieste un singur target global, permitand raportare la orice an din istoric.';

-- Migram valoarea curenta din company_settings (daca exista) ca target pentru anul curent.
insert into public.target_comercial_anual (an, target)
select extract(year from now())::integer, cs.target_comercial
from public.company_settings cs
where cs.target_comercial is not null
on conflict (an) do nothing;

alter table public.target_comercial_anual enable row level security;

drop policy if exists "target_comercial_anual_read" on public.target_comercial_anual;
create policy "target_comercial_anual_read" on public.target_comercial_anual
  for select using (auth.uid() is not null);

drop policy if exists "target_comercial_anual_write" on public.target_comercial_anual;
create policy "target_comercial_anual_write" on public.target_comercial_anual
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
