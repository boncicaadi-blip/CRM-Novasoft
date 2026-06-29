-- ============================================================================
-- Adauga date financiare firma (cifra de afaceri, nr angajati - din ANAF
-- sau introduse manual) si modul de pricing (SaaS vs OnPremise).
-- ============================================================================

alter table public.opportunities
  add column if not exists cifra_afaceri numeric(14, 2),
  add column if not exists nr_angajati integer,
  add column if not exists cifra_afaceri_an integer,
  add column if not exists cifra_afaceri_actualizat_la timestamptz,
  add column if not exists pricing_mode text not null default 'saas'
    check (pricing_mode in ('saas', 'onpremise'));

comment on column public.opportunities.cifra_afaceri is 'Cifra de afaceri anuala (RON), introdusa manual sau adusa din API ANAF (DemoANAF.ro), pe baza cod_fiscal.';
comment on column public.opportunities.cifra_afaceri_an is 'Anul fiscal caruia ii corespunde cifra_afaceri.';
comment on column public.opportunities.pricing_mode is 'Determina ce sectiune de pricing e activa: saas sau onpremise. Implementarea e comuna ambelor.';
