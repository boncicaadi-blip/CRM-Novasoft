-- ============================================================================
-- Partners devine sursa unica de "client" pentru Venituri (si, pe viitor,
-- pentru orice alt modul care are nevoie de identitatea firmei, nu de o
-- oportunitate anume). O firma poate avea mai multe oportunitati (vanzari
-- separate) - dar un singur "partner". Contractele se leaga direct de
-- partner_id, nu mai trec prin opportunity_id, deci nu mai apar duplicate
-- cand aceeasi firma are 2+ oportunitati facturabile.
--
-- Facturabil se muta conceptual pe partener - opportunities.facturabil
-- ramane (istoricul de unde a plecat bifa), dar partners.facturabil e cel
-- folosit efectiv la selectia clientului in Contracte.
-- ============================================================================

alter table public.partners add column if not exists domeniul_activitate text;
alter table public.partners add column if not exists judet text;
alter table public.partners add column if not exists oras text;
alter table public.partners add column if not exists facturabil boolean not null default false;

comment on column public.partners.facturabil is 'Firma e client real, facturabil - controleaza daca apare in selectorul de client la Contracte (Venituri). Se seteaza de obicei automat, cand se bifeaza Facturabil pe o oportunitate legata.';

-- Completam datele de firma pe partenerii deja legati de o oportunitate.
update public.partners p
set
  cod_fiscal = coalesce(p.cod_fiscal, o.cod_fiscal),
  domeniul_activitate = o.domeniul_activitate,
  judet = o.judet,
  oras = o.oras,
  facturabil = (o.facturabil or p.facturabil)
from public.opportunities o
where p.opportunity_id = o.id;
