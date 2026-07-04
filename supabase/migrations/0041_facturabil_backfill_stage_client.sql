-- ============================================================================
-- Punct de plecare pentru "Facturabil": bifam automat toate oportunitatile
-- deja aflate la stage "Client" - sunt aproape sigur clienti reali. De-acolo,
-- ajustezi manual: debifezi ce nu trebuie, bifezi si alte oportunitati care
-- reprezinta vanzari reale dar nu sunt (inca) la acest stage.
-- ============================================================================

update public.opportunities
set facturabil = true
where stage = 'Client' and facturabil = false;
