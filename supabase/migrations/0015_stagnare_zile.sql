-- ============================================================================
-- B-08: campuri pentru calculul stagnarii - zile in stage curent, zile de
-- la ultima actiune. Adaugam o coloana `stage_changed_at`, actualizata
-- automat de trigger la fiecare schimbare reala de stage (folosita pentru
-- a calcula "zile in stage" fara JOIN pe timeline la fiecare randare).
-- "Zile de la ultima actiune" se calculeaza direct din data_actiune /
-- data_finalizare_actiune existente, nu necesita coloana noua.
-- ============================================================================

alter table public.opportunities
  add column if not exists stage_changed_at timestamptz not null default now();

-- Populare initiala: presupunem ca toate oportunitatile existente au intrat
-- in stage-ul curent la ultima lor actualizare (cea mai buna aproximare
-- disponibila, in absenta unui istoric anterior de schimbari de stage).
update public.opportunities set stage_changed_at = updated_at where stage_changed_at = created_at;

create or replace function public.track_stage_changed_at()
returns trigger as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_track_stage_changed_at on public.opportunities;
create trigger trg_track_stage_changed_at
  before update on public.opportunities
  for each row execute function public.track_stage_changed_at();

comment on column public.opportunities.stage_changed_at is 'Momentul ultimei schimbari reale de stage - folosit pentru calculul "zile in stage curent" (B-08).';
