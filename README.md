# Pipeline — Strategie comerciala 2026

Aplicatie web pentru tracking-ul pipeline-ului comercial: formular de
introducere a oportunitatilor pe pasi, board Kanban + tabel pentru pipeline,
si un dashboard cu grafice (inlocuieste exportul manual catre Power BI).

## Stack

- **Next.js 16** (App Router, Server Actions) — frontend + backend in acelasi proiect
- **Supabase** — baza de date Postgres + autentificare, fara server separat de administrat
- **Recharts** — grafice dashboard
- **dnd-kit** — drag & drop pe Kanban
- Hosting recomandat: **Vercel** (tier gratuit e suficient la acest volum de date)

Cost lunar estimat la 134 oportunitati si 2-3 utilizatori: **0 lei** (ambele
servicii au tier gratuit generos pentru acest volum).

---

## 1. Creeaza proiectul Supabase

1. Mergi pe [supabase.com](https://supabase.com) → creeaza cont gratuit → "New project".
2. Alege o parola pentru baza de date (noteaz-o undeva sigur) si o regiune apropiata (ex. Frankfurt).
3. Asteapta ~2 minute cat se provizioneaza proiectul.
4. In meniul din stanga: **SQL Editor** → New query → copiaza tot continutul
   fisierului [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
   → Run. Asta creeaza toate tabelele, regulile de securitate si automatizarile
   (generare cod OPP-XXXX, istoric automat etc).
5. **Project Settings → API**: copiaza `Project URL` si `anon public` key —
   ai nevoie de ele la pasul 2.

## 2. Configureaza variabilele de mediu

```bash
cp .env.local.example .env.local
```

Editeaza `.env.local` si completeaza:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Instaleaza dependintele si porneste local

```bash
npm install
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000). O sa fii redirectat
la `/login` — apasa pe "Cont nou" si creeaza-ti contul (tu, apoi Adrian si
Stefan, fiecare cu emailul lui).

## 4. Importa datele existente din Excel (opțional, o singura data)

Daca vrei sa imporți cele 134 de oportunitati din fisierul tau curent, in loc
sa le introduci manual prin formular:

1. **Project Settings → API** → copiaza si cheia `service_role` (diferita de
   `anon` — are drepturi depline, **nu o pune niciodata intr-un fisier care
   ajunge public sau pe GitHub**).
2. Adaug-o temporar in `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Ruleaza:
   ```bash
   npm run import:excel -- /calea/catre/Strategie_comerciala_2026.xlsx
   ```
4. Scriptul citeste foaia "Pipeline", creeaza automat profiluri pentru
   responsabilii de vanzare care nu exista inca (ex. "Adrian Boncica",
   "Stefan Nedelus") si insereaza fiecare rand.
5. **Sterge `SUPABASE_SERVICE_ROLE_KEY` din `.env.local` dupa import** —
   nu mai e nevoie de ea in functionarea normala a aplicatiei.

Coloanele de Forecast nu se importa — se calculeaza automat in baza de date
din `Probability` si valorile ARR/MRR/implementare, asa ca nu mai exista
risc de erori `#VALUE!` ca in Excel.

## 5. Deploy pe Vercel (acces online pentru tine si colegi)

1. Pune codul pe GitHub (`git init`, `git add .`, `git commit`, push intr-un
   repo nou — privat, daca preferi).
2. Pe [vercel.com](https://vercel.com) → "Add New Project" → importa
   repo-ul.
3. La sectiunea "Environment Variables", adauga aceleasi doua variabile din
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` si `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   **Nu** adauga `SUPABASE_SERVICE_ROLE_KEY` aici.
4. Deploy. Vercel iti da un link `https://xxxxx.vercel.app` — acela e link-ul
   pe care il dai si lui Adrian si Stefan.
5. (Optional) Poti lega un domeniu propriu din Vercel → Settings → Domains.

De acum, orice modificare pe care o faci local cu `git push` se redeploy-aza
automat.

## Structura proiectului

```
src/
  app/
    login/                  pagina de autentificare
    (app)/                  rute protejate (cer login)
      dashboard/            graficele si KPI-urile
      pipeline/             Kanban + tabel
      oportunitati/
        noua/               formular wizard - oportunitate noua
        [id]/               vizualizare/editare oportunitate existenta
  components/
    dashboard/              componente de grafice
    pipeline/               Kanban, tabel, toggle vizualizare
    form/                   formularul wizard pe 6 pasi
  lib/
    supabase/               clienti Supabase (browser/server)
    data/                   functii de citire din baza de date
    actions/                Server Actions (create/update/delete)
    analytics.ts            agregari pentru dashboard
    constants.ts            listele de optiuni (Stage, Status, etc.)
  types/                    tipuri TypeScript
supabase/migrations/        schema SQL (de rulat in Supabase SQL Editor)
scripts/import-from-excel.ts  import unic din Excel
```

## Cum functioneaza istoricul automat

La fiecare creare/modificare a unei oportunitati, un trigger din baza de
date salveaza automat un "snapshot" complet in tabela `opportunity_history`
— exact comportamentul foii `Pipeline_History` din Excel-ul tau, dar fara
sa mai fie nevoie sa rulezi tu manual extragerea. Graficul "Evolutie ARR in
timp" din dashboard citeste din acest istoric.

## Adaugarea de noi campuri sau optiuni

- **Optiuni noi pentru un dropdown** (ex. un nou Stage sau Canal intrare):
  editezi direct `src/lib/constants.ts`, fara nicio migratie SQL.
- **Camp nou complet**: adaugi coloana in Supabase (SQL Editor), apoi in
  `src/types/opportunity.ts` si in formularul din
  `src/components/form/OpportunityForm.tsx`.

## Ce nu e inclus inca (intentionat, ca sa nu complicam de la inceput)

- Sincronizarea cu Google Calendar (exista in Excel-ul vechi, dar avea erori
  de rate-limit; o putem adauga separat cand vrei).
- Permisiuni diferentiate intre utilizatori (acum toti vad si editeaza tot).
- Export catre Power BI (datele sunt intr-un Postgres standard, deci Power BI
  se poate conecta direct la Supabase oricand, prin connection string).
