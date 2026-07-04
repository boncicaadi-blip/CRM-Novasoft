-- ============================================================================
-- Tabel unificat de "parteneri" - o singura identitate de firma, folosita ca
-- referinta comuna intre CRM (opportunities), Creante si Obligatii. Nu
-- inlocuieste nume_firma/nume_furnizor (raman neschimbate, tot codul
-- existent continua sa functioneze identic) - e o legatura ADITIONALA,
-- populata prin potrivire de nume, care permite sa vezi dintr-o parte
-- (ex: fisa unui client) daca aceeasi firma apare si ca furnizor, sau are
-- o oportunitate activa in CRM.
-- ============================================================================

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  nume_normalizat text not null,
  cod_fiscal text,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);

create unique index if not exists partners_nume_normalizat_idx on public.partners (nume_normalizat);

comment on table public.partners is 'Identitate unica de firma, folosita ca legatura optionala intre CRM, Creante si Obligatii. Populat prin potrivire de nume (vezi syncPartnersAction), niciodata prin migrare directa a datelor existente.';

alter table public.creante add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.obligatii add column if not exists partner_id uuid references public.partners(id) on delete set null;

create index if not exists creante_partner_id_idx on public.creante (partner_id);
create index if not exists obligatii_partner_id_idx on public.obligatii (partner_id);

-- ----------------------------------------------------------------------------

create or replace function public.trg_partners_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizat_la = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.partners;
create trigger set_updated_at
  before update on public.partners
  for each row execute function public.trg_partners_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: acces pe modulul Creante & Obligatii, la fel ca restul tabelelor de
-- acolo - partenerii sunt folositi in principal din aceste doua module.

alter table public.partners enable row level security;

drop policy if exists "partners_module_access" on public.partners;
create policy "partners_module_access" on public.partners
  for all using (public.has_module_access('creante_obligatii'))
  with check (public.has_module_access('creante_obligatii'));
