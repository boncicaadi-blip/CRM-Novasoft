-- ============================================================================
-- Tabel pentru credentiale de API externe (Termene.ro), editabile dintr-o
-- pagina de Setari (doar admin), in loc de variabile de mediu Vercel.
-- Un singur rand cu id fix 'termene' - simplu, fara nevoie de management
-- de chei multiple pentru acest caz de uz.
-- ============================================================================

create table if not exists public.api_credentials (
  id text primary key,
  username text,
  password text,
  extra jsonb, -- pentru campuri suplimentare (ex. schemaKey la Termene.ro)
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

comment on table public.api_credentials is 'Credentiale pentru integrari API externe (ex. Termene.ro), editabile din UI de catre admin, fara redeploy.';

alter table public.api_credentials enable row level security;

-- Doar adminii pot citi/scrie aceste credentiale.
drop policy if exists "api_credentials_admin_only" on public.api_credentials;
create policy "api_credentials_admin_only" on public.api_credentials
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

insert into public.api_credentials (id, username, password, extra)
values ('termene', null, null, '{}'::jsonb)
on conflict (id) do nothing;
