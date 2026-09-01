-- Fix: functia has_module_access (folosita de politicile RLS pe Creante,
-- Obligatii, Parteneri etc.) verifica DOAR modulul intreg
-- (profiles.module_access), ignorand complet accesul acordat pe submodule
-- individuale (profiles.submodule_access). Rezultat: un utilizator caruia
-- i s-a dat acces doar la un submodul specific (nu la tot modulul) vedea
-- pagina (garda de pagina, din aplicatie, verifica corect ambele), dar
-- interogarile catre baza de date erau blocate de RLS - datele pareau
-- goale, desi userul avea drepturi.
--
-- Submodulele sunt stocate ca "modul.submodul" (ex.
-- "creante_obligatii.creante_dashboard") - verificam acum daca userul are
-- ORICE submodul care incepe cu "modul." in plus fata de modulul intreg.

create or replace function public.has_module_access(module text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or module = any(p.module_access)
        or exists (
          select 1 from unnest(p.submodule_access) as sub
          where sub like module || '.%'
        )
      )
  );
$$;

comment on function public.has_module_access is
  'True daca userul curent e admin, are modulul intreg in profiles.module_access, sau are cel putin un submodul din acel modul in profiles.submodule_access.';
