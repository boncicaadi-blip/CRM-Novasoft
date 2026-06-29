-- ============================================================================
-- B-07: Timeline minimal pe oportunitate. Doua surse de intrari:
--  1. Automate, generate de triggere la schimbare Stage/Status/finalizare actiune.
--  2. Manuale, adaugate de utilizator (Nota, Call, Email, Demo, Oferta trimisa, Follow-up).
-- ============================================================================

create table if not exists public.opportunity_timeline (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  tip text not null check (tip in (
    'nota', 'call', 'email', 'demo', 'oferta_trimisa', 'follow_up',
    'schimbare_stage', 'schimbare_status', 'actiune_finalizata'
  )),
  continut text,
  creat_de uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_timeline_opportunity on public.opportunity_timeline (opportunity_id, created_at desc);

alter table public.opportunity_timeline enable row level security;

drop policy if exists "timeline_select_authenticated" on public.opportunity_timeline;
create policy "timeline_select_authenticated" on public.opportunity_timeline
  for select using (auth.role() = 'authenticated');

drop policy if exists "timeline_insert_authenticated" on public.opportunity_timeline;
create policy "timeline_insert_authenticated" on public.opportunity_timeline
  for insert with check (auth.role() = 'authenticated');

comment on table public.opportunity_timeline is 'Istoric cronologic pe oportunitate - intrari automate (schimbari de stage/status, finalizare actiune) si manuale (nota, call, email, demo, oferta, follow-up).';

-- ----------------------------------------------------------------------------
-- Trigger: la schimbare de Stage sau Status, inregistram automat in timeline.
-- Ruleaza AFTER UPDATE (dupa ce toate sincronizarile *_id->text s-au facut),
-- ca sa avem valorile text finale corecte.
-- ----------------------------------------------------------------------------

create or replace function public.log_opportunity_timeline_changes()
returns trigger as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (new.id, 'schimbare_stage', old.stage || ' -> ' || new.stage);
  end if;

  if new.status is distinct from old.status then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (new.id, 'schimbare_status', old.status || ' -> ' || new.status);
  end if;

  if new.status_actiune = 'Finalizata' and old.status_actiune is distinct from new.status_actiune then
    insert into public.opportunity_timeline (opportunity_id, tip, continut)
    values (
      new.id,
      'actiune_finalizata',
      coalesce(new.actiune, 'Actiune') || coalesce(' - ' || new.observatii_actiune, '')
    );
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_log_timeline_changes on public.opportunities;
create trigger trg_log_timeline_changes
  after update on public.opportunities
  for each row execute function public.log_opportunity_timeline_changes();
