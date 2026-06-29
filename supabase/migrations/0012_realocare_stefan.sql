-- ============================================================================
-- Realocare oportunitati de pe contul "placeholder" creat la import
-- (stefan.nedelus@import.local) catre contul real (stefan.nedelus@nova-soft.ro),
-- apoi stergere profil vechi. Contul din auth.users trebuie sters separat,
-- din Supabase Dashboard -> Authentication -> Users (nu se poate sterge
-- direct prin SQL Editor din motive de integritate interna Supabase).
-- ============================================================================

update public.opportunities
set responsabil_vanzare_id = (select id from public.profiles where email = 'stefan.nedelus@nova-soft.ro')
where responsabil_vanzare_id = (select id from public.profiles where email = 'stefan.nedelus@import.local');

delete from public.profiles where email = 'stefan.nedelus@import.local';
