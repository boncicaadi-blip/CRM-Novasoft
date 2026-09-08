-- Urmareste daca solicitantul a "vazut" deja raspunsul (aprobat/respins) la
-- cererea lui - folosit pentru un mic indicator (badge) pe "Cererile mele"
-- cand exista raspunsuri noi, necitite. Implicit true (cererile deja
-- existente, importate sau vechi, nu declanseaza notificari retroactive).
alter table public.concedii_cereri add column if not exists vazut_de_solicitant boolean not null default true;

comment on column public.concedii_cereri.vazut_de_solicitant is
  'False cand cererea tocmai a fost aprobata/respinsa si solicitantul nu a mai vizitat inca "Cererile mele" de atunci - baza pentru badge-ul de notificare.';
