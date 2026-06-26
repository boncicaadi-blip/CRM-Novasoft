-- ============================================================================
-- Fix: trigger-ul record_opportunity_history() insereaza in opportunity_history
-- ca utilizatorul curent (nu security definer), dar politica RLS initiala
-- permitea doar SELECT pe acel tabel, nu si INSERT. Asta bloca silentios
-- orice UPDATE pe opportunities (inclusiv schimbarea de Stage din Kanban si
-- schimbarea de Data Actiune din Calendar), pentru ca trigger-ul AFTER UPDATE
-- esua sa scrie istoricul, facand tranzactia intreaga sa pice.
-- ============================================================================

drop policy if exists "history_insert_authenticated" on public.opportunity_history;
create policy "history_insert_authenticated" on public.opportunity_history
  for insert with check (auth.role() = 'authenticated');
