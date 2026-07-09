-- ============================================================================
-- Oferte atasate pe oportunitate (PDF), cu versionare automata: la fiecare
-- reofertare, se ataseaza un fisier nou, cu numarul de versiune crescut si
-- data atasarii - istoricul complet de oferte ramane vizibil, nu se
-- suprascrie nimic.
--
-- Bucket "oferte" e public (public: true) - o alegere deliberata pentru
-- simplitate: e o unealta interna, cu 3 utilizatori, iar path-urile includ
-- UUID-ul oportunitatii + timestamp, deci practic imposibil de ghicit fara
-- acces la aplicatie. Scrierea/stergerea raman restrictionate la useri
-- autentificati prin RLS pe storage.objects.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('oferte', 'oferte', true)
on conflict (id) do nothing;

drop policy if exists "oferte_insert_authenticated" on storage.objects;
create policy "oferte_insert_authenticated" on storage.objects
  for insert with check (bucket_id = 'oferte' and auth.role() = 'authenticated');

drop policy if exists "oferte_delete_authenticated" on storage.objects;
create policy "oferte_delete_authenticated" on storage.objects
  for delete using (bucket_id = 'oferte' and auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------

create table if not exists public.opportunity_oferte (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  versiune integer not null,
  nume_fisier text not null,
  storage_path text not null,
  marime_bytes bigint,
  creat_de uuid references public.profiles(id),
  creat_la timestamptz not null default now()
);

comment on table public.opportunity_oferte is
  'Ofertele PDF atasate unei oportunitati, cu versionare automata (reofertare = versiune noua, nimic nu se suprascrie).';

create index if not exists idx_opportunity_oferte_opportunity on public.opportunity_oferte (opportunity_id, versiune desc);

alter table public.opportunity_oferte enable row level security;

drop policy if exists "opportunity_oferte_select" on public.opportunity_oferte;
create policy "opportunity_oferte_select" on public.opportunity_oferte
  for select using (auth.role() = 'authenticated');

drop policy if exists "opportunity_oferte_insert" on public.opportunity_oferte;
create policy "opportunity_oferte_insert" on public.opportunity_oferte
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "opportunity_oferte_delete" on public.opportunity_oferte;
create policy "opportunity_oferte_delete" on public.opportunity_oferte
  for delete using (auth.role() = 'authenticated');
