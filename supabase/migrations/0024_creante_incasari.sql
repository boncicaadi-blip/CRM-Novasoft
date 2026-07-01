-- ============================================================================
-- Jurnal de incasari pentru Creante - inlocuieste suma bruta editabila cu o
-- lista de tranzactii, ca sa poata fi anulata o incasare gresita fara sa
-- pierdem trasabilitatea. `creante.valoare_incasata` si `creante.data_incasare`
-- se recalculeaza automat printr-un trigger, nu se mai scriu direct.
-- ============================================================================

create table if not exists public.creante_incasari (
  id uuid primary key default gen_random_uuid(),
  creanta_id uuid not null references public.creante(id) on delete cascade,
  valoare numeric(12, 2) not null check (valoare > 0),
  data_incasare date not null,
  observatie text,
  creat_de uuid references public.profiles(id),
  creat_la timestamptz not null default now()
);

create index if not exists creante_incasari_creanta_id_idx on public.creante_incasari (creanta_id);

comment on table public.creante_incasari is 'Jurnal de incasari pe factura - fiecare incasare (integrala sau partiala) e o intrare separata, poate fi stearsa (anulata) daca a fost inregistrata din greseala.';

alter table public.creante_incasari enable row level security;

drop policy if exists "creante_incasari_admin_all" on public.creante_incasari;
create policy "creante_incasari_admin_all" on public.creante_incasari
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Trigger: recalculeaza valoare_incasata si data_incasare pe creanta parinte
-- la orice INSERT/UPDATE/DELETE in jurnal. `sold` (generated column pe
-- `creante`) se actualizeaza automat pe urma, fara cod suplimentar.

create or replace function public.trg_creante_incasari_sync()
returns trigger
language plpgsql
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.creanta_id, old.creanta_id);

  update public.creante
  set
    valoare_incasata = coalesce(
      (select sum(valoare) from public.creante_incasari where creanta_id = target_id), 0
    ),
    data_incasare = (
      select max(data_incasare) from public.creante_incasari where creanta_id = target_id
    )
  where id = target_id;

  return null;
end;
$$;

drop trigger if exists sync_valoare_incasata on public.creante_incasari;
create trigger sync_valoare_incasata
  after insert or update or delete on public.creante_incasari
  for each row execute function public.trg_creante_incasari_sync();

-- ----------------------------------------------------------------------------
-- Migram valoarea deja existenta in creante.valoare_incasata (seed-uita la
-- import) intr-o incasare initiala in jurnal, ca sa nu pierdem ce era deja
-- inregistrat, apoi lasam trigger-ul sa preia de acum inainte.

insert into public.creante_incasari (creanta_id, valoare, data_incasare, observatie)
select id, valoare_incasata, coalesce(data_incasare, data_factura, current_date),
  'Incasare initiala (din exportul de facturare, migrata automat)'
from public.creante
where valoare_incasata > 0;
