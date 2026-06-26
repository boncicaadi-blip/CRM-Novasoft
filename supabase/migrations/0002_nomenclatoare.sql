-- ============================================================================
-- Nomenclatoare administrabile - inlocuiesc listele hardcodate din constants.ts
-- pentru campurile care se pot extinde in timp (Stage, Status, Canal intrare etc).
-- ============================================================================

create table if not exists public.nomenclatoare (
  id uuid primary key default gen_random_uuid(),
  categorie text not null, -- 'stage', 'status', 'domeniu_activitate', 'produs_serviciu',
                            -- 'tip_proiect', 'canal_intrare', 'actiune', 'status_actiune'
  valoare text not null,
  culoare text, -- doar pentru stage/status, hex color; null pentru restul categoriilor
  probability numeric(5,2), -- doar pentru stage, probabilitate implicita asociata
  ordine integer not null default 0, -- ordinea de afisare in dropdown
  activ boolean not null default true, -- soft-delete: valorile dezactivate raman pe inregistrarile vechi dar nu mai apar in dropdown
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),

  unique (categorie, valoare)
);

comment on table public.nomenclatoare is 'Liste de valori administrabile pentru campurile de tip dropdown din formular (Stage, Status, Canal intrare etc). Oricine cu cont poate adauga/edita.';

create index if not exists idx_nomenclatoare_categorie on public.nomenclatoare (categorie, ordine);

alter table public.nomenclatoare enable row level security;

drop policy if exists "nomenclatoare_all_authenticated" on public.nomenclatoare;
create policy "nomenclatoare_all_authenticated" on public.nomenclatoare
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Populare initiala cu valorile deja existente in aplicatie
-- ----------------------------------------------------------------------------

insert into public.nomenclatoare (categorie, valoare, culoare, probability, ordine) values
  ('stage', 'Suspect', '#94A3B8', 0.05, 1),
  ('stage', 'Calificare', '#60A5FA', 0.15, 2),
  ('stage', 'Programare prezentare', '#38BDF8', 0.20, 3),
  ('stage', 'Prezentare', '#22D3EE', 0.30, 4),
  ('stage', 'Ofertare', '#FBBF24', 0.50, 5),
  ('stage', 'Negociere', '#FB923C', 0.75, 6),
  ('stage', 'Contractare', '#34D399', 0.90, 7)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, culoare, ordine) values
  ('status', 'Activa', '#3B82F6', 1),
  ('status', 'Castigata', '#22C55E', 2),
  ('status', 'Pierduta', '#EF4444', 3),
  ('status', 'Amanata', '#F59E0B', 4)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('domeniu_activitate', 'TRM', 1),
  ('domeniu_activitate', 'CE', 2),
  ('domeniu_activitate', 'TRM+CE', 3),
  ('domeniu_activitate', 'LOGISTICA', 4),
  ('domeniu_activitate', 'SECURITATE', 5),
  ('domeniu_activitate', 'PERSOANE', 6)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('produs_serviciu', 'SYNERGO', 1),
  ('produs_serviciu', 'ONE ERP', 2),
  ('produs_serviciu', 'PLANIFICATOR', 3),
  ('produs_serviciu', 'CONTABILITATE', 4)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('tip_proiect', 'TMS', 1),
  ('tip_proiect', 'Contabilitate', 2),
  ('tip_proiect', 'TMS + Contabilitate', 3),
  ('tip_proiect', 'Power BI', 4),
  ('tip_proiect', 'Web Clienti', 5)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('canal_intrare', 'Direct', 1),
  ('canal_intrare', 'Partener', 2),
  ('canal_intrare', 'Recomandare', 3),
  ('canal_intrare', 'Conferinte', 4)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('actiune', 'Apel', 1),
  ('actiune', 'Calificare', 2),
  ('actiune', 'Follow-up', 3),
  ('actiune', 'Negociere', 4),
  ('actiune', 'Reactivare', 5),
  ('actiune', 'Stabilire intalnire', 6),
  ('actiune', 'Oferta', 7),
  ('actiune', 'Pregatire Demo', 8),
  ('actiune', 'Contractare', 9),
  ('actiune', 'Prezentare', 10)
on conflict (categorie, valoare) do nothing;

insert into public.nomenclatoare (categorie, valoare, ordine) values
  ('status_actiune', 'Planificata', 1),
  ('status_actiune', 'Finalizata', 2)
on conflict (categorie, valoare) do nothing;
