-- Adauga website-ul companiei pe Partener - folosit pentru a afisa automat
-- logo-ul firmei (Logo.dev), pe Fisa Partenerului, pe Oportunitate si in
-- Kanban.
alter table public.partners add column if not exists website text;

comment on column public.partners.website is
  'Site-ul web al companiei (ex. exemplu.ro) - folosit pentru a afisa automat logo-ul firmei via Logo.dev.';
