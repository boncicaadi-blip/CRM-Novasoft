-- Modul Contracte - Etapa 1: infrastructura de baza pentru draft-uri de
-- contract (stocate in Supabase Storage) si istoricul contractelor
-- generate din oferte acceptate.

create table if not exists public.contract_drafturi (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  tip_contract text not null, -- ex: 'implementare', 'saas' - text liber, se pot adauga tipuri noi fara migrare
  produs_serviciu_id uuid references public.nomenclatoare(id) on delete set null,
  storage_path text not null, -- calea in bucket-ul Supabase Storage "contracte"
  versiune integer not null default 1,
  activ boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contract_drafturi is
  'Draft-uri de contract (.docx cu placeholder-uri {{tag}}), unul per tip de contract / produs. Fisierul efectiv e in Supabase Storage, bucket "contracte", sub storage_path.';
comment on column public.contract_drafturi.tip_contract is
  'Clasificare libera a tipului de contract (implementare, saas, etc.) - text, nu enum, ca sa poata fi extinsa fara migrare noua.';

create index if not exists contract_drafturi_produs_idx on public.contract_drafturi(produs_serviciu_id);

alter table public.contract_drafturi enable row level security;

create policy "contract_drafturi_select_all_authenticated" on public.contract_drafturi
  for select using (auth.role() = 'authenticated');

create policy "contract_drafturi_admin_editor_all" on public.contract_drafturi
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );

-- ============================================================================

create table if not exists public.contracte_generate (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  draft_id uuid references public.contract_drafturi(id) on delete set null,
  storage_path text not null, -- contractul final (.docx), in bucket-ul "contracte"
  status text not null default 'generat', -- 'generat' | 'validat' | 'necesita_revizuire'
  note_validare text, -- observatiile lui Claude dupa verificarea contractului generat
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.contracte_generate is
  'Istoricul contractelor generate automat din oferte acceptate - fisierul final e in Supabase Storage, note_validare contine observatiile Claude dupa verificare.';

create index if not exists contracte_generate_opportunity_idx on public.contracte_generate(opportunity_id);
create index if not exists contracte_generate_partner_idx on public.contracte_generate(partner_id);

alter table public.contracte_generate enable row level security;

create policy "contracte_generate_select_all_authenticated" on public.contracte_generate
  for select using (auth.role() = 'authenticated');

create policy "contracte_generate_admin_editor_all" on public.contracte_generate
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );

-- ============================================================================
-- Bucket Supabase Storage pentru fisierele efective (draft-uri + contracte
-- generate) - "public" doar in sensul ca link-urile semnate functioneaza
-- fara sesiune server-side suplimentara; accesul real e controlat prin
-- politicile de mai jos, nu prin bucket public necontrolat.

insert into storage.buckets (id, name, public)
values ('contracte', 'contracte', true)
on conflict (id) do nothing;

drop policy if exists "contracte_select_authenticated" on storage.objects;
create policy "contracte_select_authenticated" on storage.objects
  for select using (bucket_id = 'contracte' and auth.role() = 'authenticated');

drop policy if exists "contracte_insert_admin_editor" on storage.objects;
create policy "contracte_insert_admin_editor" on storage.objects
  for insert with check (
    bucket_id = 'contracte'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );

drop policy if exists "contracte_update_admin_editor" on storage.objects;
create policy "contracte_update_admin_editor" on storage.objects
  for update using (
    bucket_id = 'contracte'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );

drop policy if exists "contracte_delete_admin_editor" on storage.objects;
create policy "contracte_delete_admin_editor" on storage.objects
  for delete using (
    bucket_id = 'contracte'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );
