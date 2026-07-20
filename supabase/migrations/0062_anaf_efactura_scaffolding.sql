-- ============================================================================
-- Scaffolding pentru integrarea SPV / e-Factura ANAF.
--
-- Nu contine inca logica de sincronizare efectiva (asta necesita Client
-- ID/Secret de la ANAF, pe care Adi le genereaza separat) - doar structura
-- de date, pregatita sa primeasca facturi descarcate automat, cu
-- deduplicare fata de Creante/Obligatii existente.
--
-- Conexiunea (token OAuth) NU are tabel nou - reutilizeaza tabelul generic
-- `api_credentials` deja folosit pentru Termene.ro (id='anaf'), cu
-- username=Client ID, password=Client Secret, extra=jsonb cu
-- access_token/refresh_token/expires_at/connected_at.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

comment on function public.is_admin is 'True daca userul curent e admin. Folosit in RLS pentru tabele strict-admin (credentiale API, integrari financiare sensibile).';

-- ----------------------------------------------------------------------------

create table if not exists public.anaf_facturi (
  id uuid primary key default gen_random_uuid(),
  -- Id-ul mesajului din SPV - cheie de deduplicare la nivel de descarcare,
  -- ca acelasi mesaj sa nu fie descarcat/procesat de doua ori.
  mesaj_id_anaf text not null unique,
  tip text not null check (tip in ('emisa', 'primita')),
  cui_partener text,
  nume_partener text,
  nr_factura text,
  data_factura date,
  valoare numeric(12, 2),
  moneda text not null default 'RON',
  -- Calea catre XML/ZIP-ul original in Supabase Storage (bucket privat).
  storage_path text,
  -- 'noua' = descarcata, neprocesata inca.
  -- 'potrivita' = gaseste deja un rand corespunzator in Creante/Obligatii (nu se importa din nou).
  -- 'importata' = a fost adaugata ca rand nou in Creante/Obligatii.
  -- 'ignorata' = marcata manual ca "nu se importa" (ex. duplicat cunoscut, irelevanta).
  stare text not null default 'noua' check (stare in ('noua', 'potrivita', 'importata', 'ignorata')),
  creanta_id uuid references public.creante(id) on delete set null,
  obligatie_id uuid references public.obligatii(id) on delete set null,
  descarcat_la timestamptz not null default now()
);

comment on table public.anaf_facturi is
  'Facturi descarcate din SPV (e-Factura ANAF) - metadate + legatura catre Creante/Obligatii dupa deduplicare. Scaffolding: populat abia dupa configurarea Client ID/Secret in Setari -> Integrari.';

create index if not exists idx_anaf_facturi_stare on public.anaf_facturi (stare);
create index if not exists idx_anaf_facturi_nr_factura on public.anaf_facturi (nr_factura);

alter table public.anaf_facturi enable row level security;

drop policy if exists "anaf_facturi_admin" on public.anaf_facturi;
create policy "anaf_facturi_admin" on public.anaf_facturi
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Bucket privat (spre deosebire de "oferte") - documente fiscale, nu oferte
-- comerciale. Acces doar prin URL-uri semnate, generate server-side, doar
-- pentru admin.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('facturi-anaf', 'facturi-anaf', false)
on conflict (id) do nothing;

drop policy if exists "facturi_anaf_admin_select" on storage.objects;
create policy "facturi_anaf_admin_select" on storage.objects
  for select using (bucket_id = 'facturi-anaf' and public.is_admin());

drop policy if exists "facturi_anaf_admin_insert" on storage.objects;
create policy "facturi_anaf_admin_insert" on storage.objects
  for insert with check (bucket_id = 'facturi-anaf' and public.is_admin());

drop policy if exists "facturi_anaf_admin_delete" on storage.objects;
create policy "facturi_anaf_admin_delete" on storage.objects
  for delete using (bucket_id = 'facturi-anaf' and public.is_admin());
