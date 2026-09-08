"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Merge, RefreshCw, ArrowUp, ArrowDown, BadgeCheck, Plus, ExternalLink } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/logo";
import {
  updatePartnerAction,
  backfillCodFiscalFromOpportunitiesAction,
  mergePartnersAction,
  verificaDenumiriTermeneAction,
  curataCifInvalideAction,
  aplicaToateNumeleTermeneAction,
  type VerificareTermeneRezultat,
} from "@/lib/actions/parteneri-admin";
import { syncPartnersAction } from "@/lib/actions/partners";
import { preiaDateFinanciareBulkAction } from "@/lib/actions/partener-fisa";
import { findDuplicatesByCif, findSimilarNamePairs } from "@/lib/parteneri-utils";
import type { PartnerOverviewRow } from "@/lib/data/parteneri-admin";
import { AddPartnerModal } from "./AddPartnerModal";

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary outline-none focus:border-[#E8007A]";

type SortColumn = "nume" | "cod_fiscal" | "facturabil" | "este_furnizor" | "potential" | "nr_creante" | "nr_obligatii" | "nr_contracte" | "nr_linii";

function PartnerRow({ partner }: { partner: PartnerOverviewRow }) {
  const router = useRouter();
  const [nume, setNume] = useState(partner.nume);
  const logoUrl = getCompanyLogoUrl(partner.website, 32);
  const [codFiscal, setCodFiscal] = useState(partner.cod_fiscal ?? "");
  const [numeGrup, setNumeGrup] = useState(partner.nume_grup ?? "");
  const [isPending, startTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const hasChanges =
    nume !== partner.nume || codFiscal !== (partner.cod_fiscal ?? "") || numeGrup !== (partner.nume_grup ?? "");

  function handleToggle(field: "facturabil" | "este_furnizor" | "potential", value: boolean) {
    startToggleTransition(async () => {
      const result = await updatePartnerAction(partner.id, { [field]: value });
      if (result.success) router.refresh();
    });
  }

  function handleSave() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const result = await updatePartnerAction(partner.id, {
        nume: nume !== partner.nume ? nume : undefined,
        cod_fiscal: codFiscal !== (partner.cod_fiscal ?? "") ? codFiscal : undefined,
        nume_grup: numeGrup !== (partner.nume_grup ?? "") ? (numeGrup || null) : undefined,
      });
      if (result.success) {
        const p = result.propagat;
        setMessage(
          p ? `Salvat. Aplicat pe ${p.creante + p.obligatii + p.contracte + p.linii} randuri.` : "Salvat."
        );
        router.refresh();
      } else {
        setIsError(true);
        setMessage(result.message ?? "Eroare la salvare.");
      }
    });
  }

  const totalLinks = partner.nr_creante + partner.nr_obligatii + partner.nr_contracte + partner.nr_linii;

  return (
    <tr className="border-b border-border-faint">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-5 w-5 shrink-0 rounded border border-border-subtle bg-white object-contain p-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <input value={nume} onChange={(e) => setNume(e.target.value)} className={inputClass} />
        </div>
      </td>
      <td className="px-3 py-2">
        <Link
          href={`/parteneri/${partner.id}`}
          className="flex items-center gap-1 whitespace-nowrap rounded-md border border-border-subtle px-2 py-1 text-xs font-medium text-text-primary transition hover:border-[#E8007A] hover:text-[#E8007A]"
        >
          <ExternalLink size={12} />
          Deschide fisa
        </Link>
      </td>
      <td className="px-3 py-2">
        <input
          value={codFiscal}
          onChange={(e) => setCodFiscal(e.target.value)}
          placeholder="—"
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2 text-xs text-text-secondary">{partner.opportunity_nume ?? "—"}</td>
      <td className="px-3 py-2">
        <input
          value={numeGrup}
          onChange={(e) => setNumeGrup(e.target.value)}
          placeholder="—"
          title="Grup de firme (ex. MARA) - folosit in Dashboard Creante/Venituri pentru agregare"
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={partner.facturabil}
          disabled={isTogglePending}
          onChange={(e) => handleToggle("facturabil", e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
          title="Client - apare in dropdown-ul de clienti la Creante/Venituri"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={partner.este_furnizor}
          disabled={isTogglePending}
          onChange={(e) => handleToggle("este_furnizor", e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
          title="Furnizor - apare in dropdown-ul de furnizori la adaugarea manuala de Obligatii"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={partner.potential}
          disabled={isTogglePending}
          onChange={(e) => handleToggle("potential", e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
          title="Potential - prospect/lead, inca nu client sau furnizor"
        />
      </td>
      <td className="px-3 py-2 text-center text-xs text-text-secondary">{partner.nr_creante}</td>
      <td className="px-3 py-2 text-center text-xs text-text-secondary">{partner.nr_obligatii}</td>
      <td className="px-3 py-2 text-center text-xs text-text-secondary">{partner.nr_contracte}</td>
      <td className="px-3 py-2 text-center text-xs text-text-secondary">{partner.nr_linii}</td>
      <td className="px-3 py-2">
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-[#E8007A] px-2.5 py-1 text-[11px] font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            {isPending ? "..." : `Salveaza${totalLinks > 0 ? " si aplica" : ""}`}
          </button>
        )}
        {message && (
          <p className={`mt-1 text-[11px] font-medium ${isError ? "text-red-400" : "text-green-400"}`}>{message}</p>
        )}
      </td>
    </tr>
  );
}

function DuplicateGroup({ group }: { group: PartnerOverviewRow[] }) {
  const router = useRouter();
  const sortedByLinks = [...group].sort((a, b) => {
    const totalA = a.nr_creante + a.nr_obligatii + a.nr_contracte + a.nr_linii;
    const totalB = b.nr_creante + b.nr_obligatii + b.nr_contracte + b.nr_linii;
    return totalB - totalA;
  });
  const [keepId, setKeepId] = useState(sortedByLinks[0].id);
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleMerge() {
    startTransition(async () => {
      const mergeIds = group.map((p) => p.id);
      const result = await mergePartnersAction(keepId, mergeIds);
      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare la fuziune.");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="mb-2 text-xs text-amber-400">
        CIF <span className="font-mono">{group[0].cod_fiscal}</span> apare la {group.length} parteneri diferiti:
      </p>
      <div className="space-y-1.5">
        {group.map((p) => {
          const total = p.nr_creante + p.nr_obligatii + p.nr_contracte + p.nr_linii;
          return (
            <label key={p.id} className="flex items-center gap-2 text-xs text-text-primary">
              <input
                type="radio"
                name={`keep-${group[0].cod_fiscal}`}
                checked={keepId === p.id}
                onChange={() => setKeepId(p.id)}
                className="h-3.5 w-3.5"
              />
              <span className="font-medium">{p.nume}</span>
              <span className="text-text-muted">
                ({total} legaturi: {p.nr_creante} creante, {p.nr_obligatii} obligatii, {p.nr_contracte} contracte,{" "}
                {p.nr_linii} linii)
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-text-muted">
        Pastreaza numele partenerului bifat, muta toate legaturile pe el, sterge restul. Ireversibil.
      </p>
      {message && <p className="mt-1 text-[11px] text-red-400">{message}</p>}
      {confirming ? (
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleMerge}
            disabled={isPending}
            className="rounded-md bg-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50"
          >
            {isPending ? "Se fuzioneaza..." : "Confirma fuziunea"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-1"
          >
            Anuleaza
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-amber-500/30 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-500/10"
        >
          <Merge size={12} />
          Fuzioneaza acesti {group.length} parteneri
        </button>
      )}
    </div>
  );
}

function SimilarPairRow({ a, b }: { a: PartnerOverviewRow; b: PartnerOverviewRow }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-xs">
      <span className="font-medium text-text-primary">{a.nume}</span>
      <span className="text-text-faint">vs</span>
      <span className="font-medium text-text-primary">{b.nume}</span>
      <span className="ml-auto text-text-muted">
        {a.cod_fiscal || b.cod_fiscal ? `CIF: ${a.cod_fiscal ?? "—"} / ${b.cod_fiscal ?? "—"}` : "fara CIF completat inca"}
      </span>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sortColumn,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDir: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  align?: "center";
}) {
  const active = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className={`cursor-pointer select-none px-3 py-2 text-xs text-text-muted transition hover:text-text-primary ${align === "center" ? "text-center" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </span>
    </th>
  );
}

export function ParteneriClient({ partners }: { partners: PartnerOverviewRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isVerifying, startVerifying] = useTransition();
  const [isPreluandFinanciarBulk, startPreluandFinanciarBulk] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("nume");
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"lista" | "duplicate">("lista");
  const [tipFilter, setTipFilter] = useState<"" | "client" | "furnizor" | "potential">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [termeneRezultate, setTermeneRezultate] = useState<VerificareTermeneRezultat[] | null>(null);

  const duplicateGroups = useMemo(() => findDuplicatesByCif(partners), [partners]);
  const similarPairs = useMemo(() => findSimilarNamePairs(partners), [partners]);

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let rows = partners;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.nume.toLowerCase().includes(q) || (p.cod_fiscal ?? "").includes(q));
    }
    if (tipFilter === "client") rows = rows.filter((p) => p.facturabil);
    else if (tipFilter === "furnizor") rows = rows.filter((p) => p.este_furnizor);
    else if (tipFilter === "potential") rows = rows.filter((p) => p.potential);
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "nume") cmp = a.nume.localeCompare(b.nume);
      else if (sortColumn === "cod_fiscal") cmp = (a.cod_fiscal ?? "").localeCompare(b.cod_fiscal ?? "");
      else if (sortColumn === "facturabil" || sortColumn === "este_furnizor" || sortColumn === "potential") {
        cmp = Number(a[sortColumn]) - Number(b[sortColumn]);
      } else cmp = a[sortColumn] - b[sortColumn];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [partners, search, tipFilter, sortColumn, sortDir]);

  function handleSyncPartners() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncPartnersAction();
      if (result.success && result.data) {
        setMessage(
          `${result.data.parteneriNoi} parteneri noi, ${result.data.creanteLegate} creante legate, ${result.data.obligatiiLegate} obligatii legate, ${result.data.oportunitatiLegate} oportunitati legate.`
        );
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare la sincronizare.");
      }
    });
  }

  function handlePreiaFinanciarBulk() {
    if (
      !confirm(
        'Preia cifra de afaceri si nr. angajati din ANAF pentru toti partenerii bifati Client sau Potential? Poate dura cateva minute daca sunt multi.'
      )
    )
      return;
    setMessage(null);
    startPreluandFinanciarBulk(async () => {
      const result = await preiaDateFinanciareBulkAction();
      if (result.success) {
        setMessage(
          `${result.nrActualizati ?? 0} actualizati, ${result.nrEsuati ?? 0} fara bilant gasit, ${result.nrFaraCif ?? 0} fara CIF completat.`
        );
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare.");
      }
    });
  }

  function handleBackfill() {
    setMessage(null);
    startTransition(async () => {
      const result = await backfillCodFiscalFromOpportunitiesAction();
      if (result.success) {
        setMessage(`${result.nrCompletate ?? 0} CIF-uri completate (din oportunitati sau din facturi ANAF deja legate).`);
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare.");
      }
    });
  }

  function handleCurataCif() {
    setMessage(null);
    startTransition(async () => {
      const result = await curataCifInvalideAction();
      if (result.success) {
        setMessage(
          result.nrCuratate
            ? `${result.nrCuratate} CIF-uri invalide (Nr. Reg. Com.) golite - le poti recompleta cu "Completeaza CIF".`
            : (result.message ?? "Niciun CIF invalid gasit.")
        );
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare.");
      }
    });
  }

  function handleVerifyTermene() {
    setMessage(null);
    setTermeneRezultate(null);
    startVerifying(async () => {
      const result = await verificaDenumiriTermeneAction();
      if (result.success) {
        setTermeneRezultate(result.rezultate ?? []);
      } else {
        setMessage(result.message ?? "Eroare la verificare.");
      }
    });
  }

  function handleAplicaToateTermene() {
    if (!termeneRezultate) return;
    startTransition(async () => {
      const result = await aplicaToateNumeleTermeneAction(
        termeneRezultate
          .filter((r) => r.numeTermene)
          .map((r) => ({ partnerId: r.partnerId, numeTermene: r.numeTermene }))
      );
      setMessage(result.message ?? (result.success ? `${result.nrAplicate ?? 0} nume aplicate.` : "Eroare."));
      if (result.success) {
        setTermeneRezultate(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-heading text-text-primary">Parteneri</h1>
      <p className="mb-4 text-sm text-text-muted">
        Identitatea unica a firmelor - un partener aici poate fi legat de Creante, Obligatii, Contracte si Linii de
        venit. Editeaza numele sau CIF-ul aici si se aplica automat peste tot unde e legat.
      </p>

      <div className="mb-4 flex gap-2 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab("lista")}
          className={`px-3 py-2 text-sm font-medium transition ${
            activeTab === "lista"
              ? "border-b-2 border-[#E8007A] text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Toti partenerii ({partners.length})
        </button>
        <button
          onClick={() => setActiveTab("duplicate")}
          className={`px-3 py-2 text-sm font-medium transition ${
            activeTab === "duplicate"
              ? "border-b-2 border-[#E8007A] text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Duplicate {duplicateGroups.length + similarPairs.length > 0 && `(${duplicateGroups.length + similarPairs.length})`}
        </button>
      </div>

      {activeTab === "duplicate" && (
        <div>
          {duplicateGroups.length === 0 && similarPairs.length === 0 && !termeneRezultate && (
            <p className="mb-4 text-sm text-text-muted">
              Niciun duplicat gasit momentan. Poti rula „Verifica denumiri pe Termene.ro&rdquo; din tabul „Toti partenerii&rdquo;
              pentru o verificare suplimentara a denumirilor.
            </p>
          )}

          {duplicateGroups.length > 0 && (
            <div className="mb-5 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Duplicate confirmate - acelasi CIF ({duplicateGroups.length})
              </p>
              {duplicateGroups.map((group) => (
                <DuplicateGroup key={group[0].cod_fiscal} group={group} />
              ))}
            </div>
          )}

          {similarPairs.length > 0 && (
            <div className="mb-5 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Posibile duplicate - nume asemanator, de verificat manual ({similarPairs.length})
              </p>
              {similarPairs.map(({ a, b }) => (
                <SimilarPairRow key={`${a.id}-${b.id}`} a={a} b={b} />
              ))}
            </div>
          )}

          {termeneRezultate && (
            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Verificare Termene.ro - {termeneRezultate.length === 0 ? "toate denumirile corespund" : `${termeneRezultate.length} diferente gasite`}
                </p>
                {termeneRezultate.some((r) => r.numeTermene) && (
                  <button
                    onClick={handleAplicaToateTermene}
                    disabled={isPending}
                    className="rounded-md bg-[#E8007A] px-2.5 py-1 text-[11px] font-medium text-[#0B0D1A] hover:bg-[#FF4FAA] disabled:opacity-50"
                  >
                    Aplica toate ({termeneRezultate.filter((r) => r.numeTermene).length})
                  </button>
                )}
              </div>
              {termeneRezultate.map((r) => (
                <div key={r.partnerId} className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-xs">
                  {r.eroare ? (
                    <span className="text-text-muted">
                      {r.numeCurent}: <span className="text-red-400">{r.eroare}</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-text-primary">{r.numeCurent}</span>
                      <span className="text-text-faint">→ Termene.ro:</span>
                      <span className="font-medium text-amber-400">{r.numeTermene}</span>
                      <TermeneApplyButton partnerId={r.partnerId} numeNou={r.numeTermene ?? ""} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "lista" && (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta dupa nume sau CIF..."
          className="min-w-[220px] flex-1 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
        <div className="flex items-center gap-1 rounded-md border border-border-subtle p-0.5">
          {(["", "client", "furnizor", "potential"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipFilter(t)}
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                tipFilter === t ? "bg-[#E8007A] text-[#0B0D1A]" : "text-text-secondary hover:bg-surface-1"
              }`}
            >
              {t === "" ? "Toti" : t === "client" ? "Client" : t === "furnizor" ? "Furnizor" : "Potential"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-1"
        >
          <Plus size={13} />
          Adauga partener nou
        </button>
        <button
          onClick={handleSyncPartners}
          disabled={isPending}
          title="Cauta firme comune intre Creante, Obligatii si Oportunitati - creeaza parteneri noi si leaga randurile inca nelegate"
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
          Sincronizeaza parteneri
        </button>
        <button
          onClick={handlePreiaFinanciarBulk}
          disabled={isPreluandFinanciarBulk}
          title="Preia cifra de afaceri (EUR) si nr. angajati din bilanturile ANAF, pentru toti partenerii Client sau Potential cu CIF completat"
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={13} className={isPreluandFinanciarBulk ? "animate-spin" : ""} />
          {isPreluandFinanciarBulk ? "Se preiau date financiare..." : "Preia date financiare (ANAF)"}
        </button>
        <button
          onClick={handleBackfill}
          disabled={isPending}
          title="Completeaza CIF din oportunitatea legata sau din facturi ANAF deja legate de acest partener"
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
          Completeaza CIF
        </button>
        <button
          onClick={handleCurataCif}
          disabled={isPending}
          title="Goleste CIF-urile invalide (arata ca Nr. Reg. Com., nu ca CIF real) - ramase din date vechi"
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          Curata CIF-uri invalide
        </button>
        <button
          onClick={handleVerifyTermene}
          disabled={isVerifying}
          title="Verifica in bloc, pe Termene.ro, denumirea oficiala pentru toti partenerii cu CIF completat"
          className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <BadgeCheck size={13} />
          {isVerifying ? "Se verifica..." : "Verifica denumiri pe Termene.ro"}
        </button>
      </div>
      )}

      {activeTab === "lista" && (
      <>
      {message && <p className="mb-3 text-xs text-text-muted">{message}</p>}

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs text-text-muted">
              <SortHeader label="Nume" column="nume" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2">Fisa</th>
              <SortHeader label="CIF" column="cod_fiscal" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2">Oportunitate</th>
              <th className="px-3 py-2">Grup</th>
              <SortHeader label="Client" column="facturabil" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Furnizor" column="este_furnizor" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Potential" column="potential" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Creante" column="nr_creante" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Obligatii" column="nr_obligatii" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Contracte" column="nr_contracte" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <SortHeader label="Linii" column="nr_linii" sortColumn={sortColumn} sortDir={sortDir} onSort={handleSort} align="center" />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <PartnerRow key={p.id} partner={p} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-sm text-text-muted">
                  Niciun partener pentru filtrul curent.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {showAddModal && <AddPartnerModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function TermeneApplyButton({ partnerId, numeNou }: { partnerId: string; numeNou: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);

  function handleApply() {
    startTransition(async () => {
      const result = await updatePartnerAction(partnerId, { nume: numeNou });
      if (result.success) {
        setApplied(true);
        router.refresh();
      }
    });
  }

  if (applied) return <span className="text-green-400">Aplicat</span>;

  return (
    <button
      onClick={handleApply}
      disabled={isPending}
      className="rounded-md border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
    >
      {isPending ? "..." : "Aplica"}
    </button>
  );
}
