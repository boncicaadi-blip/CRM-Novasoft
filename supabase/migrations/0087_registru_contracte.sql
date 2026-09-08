-- Registrul de contracte - reproduce structura din Excel-ul folosit pana
-- acum (REGISTRU_CTR_NVS.xlsx), cu numerotare automata, tinuta direct in
-- CRM de acum incolo.

create table if not exists public.registru_contracte (
  id uuid primary key default gen_random_uuid(),
  nr_contract integer not null,
  tip_partener text not null, -- 'client' | 'furnizor'
  tip_document text, -- Contract, Anexa, Act aditional, Anulat etc. - text liber, ca in Excel
  data_contract date,

  partner_id uuid references public.partners(id) on delete set null,
  partener_nume_liber text, -- fallback - numele din Excel, cand nu s-a putut potrivi cu un partener din CRM

  produs_serviciu_id uuid references public.nomenclatoare(id) on delete set null,
  serviciu_id uuid references public.nomenclatoare(id) on delete set null, -- categoria "venit_serviciu"
  detalii_serviciu text,

  contact_nume text,
  contact_email text,
  contact_telefon text,
  contact2_nume text, -- doar la clienti - contact tichete/suport, separat de facturare
  contact2_email text,
  contact2_telefon text,

  status_draft boolean not null default false,
  status_trimis boolean not null default false,
  status_in_sistem boolean not null default false,
  status_generat_grafic boolean not null default false,
  status_semnat boolean not null default false,
  status_primit boolean not null default false,
  status_atasat boolean not null default false,
  data_ultimului_status date,

  contract_generat_id uuid references public.contracte_generate(id) on delete set null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  unique (nr_contract, tip_partener)
);

comment on table public.registru_contracte is
  'Registrul de contracte (clienti si furnizori) - inlocuieste evidenta tinuta pana acum in Excel/Google Drive. Numerotarea e secventiala, separata pe tip_partener.';
comment on column public.registru_contracte.partener_nume_liber is
  'Numele exact din sursa originala (Excel) - pastrat mereu, chiar si cand partner_id e completat, ca sa nu se piarda contextul istoric daca fisa partenerului se schimba.';

create index if not exists registru_contracte_partner_idx on public.registru_contracte(partner_id);
create index if not exists registru_contracte_tip_idx on public.registru_contracte(tip_partener);

alter table public.registru_contracte enable row level security;

create policy "registru_contracte_select_all_authenticated" on public.registru_contracte
  for select using (auth.role() = 'authenticated');

create policy "registru_contracte_admin_editor_all" on public.registru_contracte
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'editor'))
  );
