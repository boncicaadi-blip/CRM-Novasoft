-- ============================================================================
-- Pentru contracte Nerecurente (Rate, Etape sau Integral) - numarul de linii
-- de venit generate automat, spatiate lunar, cu valoarea impartita egal.
-- Integral = 1 rata (o singura linie, valoarea intreaga). Dupa generare,
-- fiecare linie se poate edita individual (valoare + luna), pentru rate
-- inegale sau date specifice.
-- ============================================================================

alter table public.contracte add column if not exists nr_rate integer not null default 1 check (nr_rate >= 1);

comment on column public.contracte.nr_rate is 'Doar pentru Nerecurent: cate linii de venit se genereaza (spatiate lunar, valoare egal impartita). 1 = Integral.';
