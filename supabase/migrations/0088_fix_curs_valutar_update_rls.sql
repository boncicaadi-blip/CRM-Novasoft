-- Fix critic: curs_valutar avea doar politica de INSERT, nu si de UPDATE.
-- Codul foloseste .upsert() (INSERT ... ON CONFLICT DO UPDATE) - fara o
-- politica de UPDATE, orice upsert care nimerea peste un rand deja existent
-- (adica orice reincercare de reimprospatare a unui an deja partial
-- cache-uit) esua complet cu "new row violates row-level security policy",
-- lasand cache-ul inghetat la ultima reusita (prima populare, niciodata
-- actualizat dupa).

drop policy if exists "curs_valutar_update_authenticated" on public.curs_valutar;
create policy "curs_valutar_update_authenticated" on public.curs_valutar
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
