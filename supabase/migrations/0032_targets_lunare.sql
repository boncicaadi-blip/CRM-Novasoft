-- ============================================================================
-- Target lunar de incasare/plata - setat manual la inceputul lunii, urmarit
-- in timp real (GRT = realizat / target) si pastrat istoric.
--
-- Nu stocam separat "realizat" - se calculeaza mereu live din jurnalul de
-- incasari/plati (avem data exacta pe fiecare tranzactie), deci ramane mereu
-- corect, chiar daca se anuleaza/adauga incasari ulterior pe o luna trecuta.
-- ============================================================================

create table if not exists public.creante_targets_lunare (
  id uuid primary key default gen_random_uuid(),
  luna text not null unique, -- format 'YYYY-MM'
  target numeric(12, 2) not null default 0,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.creante_targets_lunare is 'Target de incasare per luna calendaristica - baza pentru GRT (Grad Realizare Target).';

create table if not exists public.obligatii_targets_lunare (
  id uuid primary key default gen_random_uuid(),
  luna text not null unique,
  target numeric(12, 2) not null default 0,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

comment on table public.obligatii_targets_lunare is 'Target de plata per luna calendaristica - baza pentru GRT (Grad Realizare Target).';

-- ----------------------------------------------------------------------------

create or replace function public.trg_targets_lunare_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizat_la = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.creante_targets_lunare;
create trigger set_updated_at
  before update on public.creante_targets_lunare
  for each row execute function public.trg_targets_lunare_set_updated_at();

drop trigger if exists set_updated_at on public.obligatii_targets_lunare;
create trigger set_updated_at
  before update on public.obligatii_targets_lunare
  for each row execute function public.trg_targets_lunare_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: acces pe modulul Creante & Obligatii, la fel ca restul tabelelor.

alter table public.creante_targets_lunare enable row level security;
alter table public.obligatii_targets_lunare enable row level security;

drop policy if exists "creante_targets_lunare_module_access" on public.creante_targets_lunare;
create policy "creante_targets_lunare_module_access" on public.creante_targets_lunare
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));

drop policy if exists "obligatii_targets_lunare_module_access" on public.obligatii_targets_lunare;
create policy "obligatii_targets_lunare_module_access" on public.obligatii_targets_lunare
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));
