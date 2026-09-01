-- Tip contract trece de la text liber la nomenclatorul deja existent
-- "venit_serviciu" (Mentenanta, Suport tehnic, Implementare, SaaS, IaaS
-- etc.) - sunt deja categoriile reale folosite la facturare, are sens sa
-- fie aceeasi sursa de adevar, nu o lista separata.

alter table public.contract_drafturi add column if not exists tip_contract_id uuid references public.nomenclatoare(id) on delete set null;

-- Backfill cele cateva draft-uri deja incarcate (potrivire dupa text, fara
-- sa tina cont de majuscule).
update public.contract_drafturi cd
set tip_contract_id = n.id
from public.nomenclatoare n
where n.categorie = 'venit_serviciu'
  and upper(n.valoare) = upper(cd.tip_contract)
  and cd.tip_contract_id is null;

alter table public.contract_drafturi drop column if exists tip_contract;

comment on column public.contract_drafturi.tip_contract_id is
  'Tipul de contract - referinta catre nomenclatoare, categoria "venit_serviciu" (Implementare, SaaS, Mentenanta etc.) - aceeasi lista folosita si la facturare.';
