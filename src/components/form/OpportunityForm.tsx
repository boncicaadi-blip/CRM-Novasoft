"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  ClipboardCheck,
  GitBranch,
  CalendarClock,
  Wallet,
  Radio,
  Check,
} from "lucide-react";
import { Field, TextInput, TextArea, Select, Checkbox, MoneyInput } from "@/components/form/fields";
import { formatEur } from "@/lib/format";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import {
  DA_NU_NUSTIU,
  JUDETE,
  SUBSTATUS_SUGGESTIONS,
} from "@/lib/constants";
import type { Opportunity, Profile, Nomenclator } from "@/types/opportunity";
import {
  createOpportunityAction,
  updateOpportunityAction,
} from "@/lib/actions/opportunities";
import { lookupAnafCompanyAction } from "@/lib/actions/anaf";

const STEPS = [
  { key: "firma", label: "Firma", icon: Building2 },
  { key: "calificare", label: "Calificare", icon: ClipboardCheck },
  { key: "pipeline", label: "Pipeline", icon: GitBranch },
  { key: "actiune", label: "Actiune", icon: CalendarClock },
  { key: "pricing", label: "Pricing", icon: Wallet },
  { key: "sursa", label: "Sursa", icon: Radio },
] as const;

function toDateInputValue(v: string | null | undefined) {
  if (!v) return "";
  return v.slice(0, 10);
}

/** Extrage doar valoarea (string) dintr-o lista de nomenclatoare, in ordinea definita. */
function valori(items: Nomenclator[] | undefined): string[] {
  return (items ?? []).map((i) => i.valoare);
}

export function OpportunityForm({
  opportunity,
  profiles,
  nomenclatoare,
}: {
  opportunity?: Opportunity;
  profiles: Profile[];
  nomenclatoare: Record<string, Nomenclator[]>;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef);
  const isEdit = !!opportunity;

  const stages = nomenclatoare["stage"] ?? [];
  const statuses = valori(nomenclatoare["status"]);
  const domeniiActivitate = valori(nomenclatoare["domeniu_activitate"]);
  const produseServicii = valori(nomenclatoare["produs_serviciu"]);
  const tipuriProiect = valori(nomenclatoare["tip_proiect"]);
  const canaleIntrare = valori(nomenclatoare["canal_intrare"]);
  const actiuni = valori(nomenclatoare["actiune"]);
  const statusActiune = valori(nomenclatoare["status_actiune"]);

  const probabilityByStage: Record<string, number> = {};
  for (const s of stages) {
    if (s.probability !== null) probabilityByStage[s.valoare] = s.probability;
  }

  const [status, setStatus] = useState(opportunity?.status ?? statuses[0] ?? "Activa");
  const [stage, setStage] = useState(opportunity?.stage ?? stages[0]?.valoare ?? "Suspect");
  const [probability, setProbability] = useState(
    opportunity?.probability ?? probabilityByStage[stage] ?? 0
  );

  const substatusOptions = SUBSTATUS_SUGGESTIONS[status] ?? [];

  // --- Pricing: state pentru preview live al formulelor (calculul real, sursa
  // de adevar, se face in baza de date la salvare - astea sunt doar pentru UX) ---
  const [pricingMode, setPricingMode] = useState<"saas" | "onpremise">(
    opportunity?.pricing_mode ?? "saas"
  );
  const [codFiscal, setCodFiscal] = useState(opportunity?.cod_fiscal ?? "");
  const [numeGrup, setNumeGrup] = useState(opportunity?.nume_grup ?? "");
  const [numePotential, setNumePotential] = useState(opportunity?.nume_potential ?? "");
  const [judetField, setJudetField] = useState(opportunity?.judet ?? "");
  const [orasField, setOrasField] = useState(opportunity?.oras ?? "");
  const [anafLookupState, setAnafLookupState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [anafLookupError, setAnafLookupError] = useState<string | null>(null);
  const [anafDomeniuGasit, setAnafDomeniuGasit] = useState<string | null>(null);

  function handleAnafLookup() {
    if (!codFiscal) return;
    setAnafLookupState("loading");
    setAnafLookupError(null);
    lookupAnafCompanyAction(codFiscal)
      .then((res) => {
        if (!res.success) {
          setAnafLookupState("error");
          setAnafLookupError(res.error ?? null);
          return;
        }
        if (res.denumire && !numePotential) setNumePotential(res.denumire);
        if (res.denumire && !numeGrup) setNumeGrup(res.denumire);
        if (res.judet) setJudetField(res.judet);
        if (res.oras) setOrasField(res.oras);
        setAnafDomeniuGasit(res.domeniulActivitate ?? null);
        setAnafLookupState("done");
      })
      .catch((e) => {
        setAnafLookupState("error");
        setAnafLookupError(e instanceof Error ? e.message : String(e));
      });
  }
  const [nrUtilizatori, setNrUtilizatori] = useState(
    String(opportunity?.nr_utilizatori_synergo ?? "")
  );
  const [mrrSynergo, setMrrSynergo] = useState(String(opportunity?.mrr_synergo ?? ""));
  const [pachetServerAnual, setPachetServerAnual] = useState(
    String(opportunity?.valoare_pachet_server_anual ?? "")
  );
  const [firmaSuplimentara, setFirmaSuplimentara] = useState(
    String(opportunity?.valoare_firma_suplimentara ?? "")
  );
  const [pachetOnpremise, setPachetOnpremise] = useState(
    String(opportunity?.pachet_synergo_onpremise ?? "")
  );
  const [licentaCompanie, setLicentaCompanie] = useState(
    String(opportunity?.licenta_companie_suplimentara ?? "")
  );
  const [licentaUseri, setLicentaUseri] = useState(
    String(opportunity?.licenta_useri_suplimentari_onpremise ?? "")
  );
  const [mentenantaPerUser, setMentenantaPerUser] = useState(
    String(opportunity?.valoare_mentenanta_per_user_onpremise ?? "")
  );

  const nrUtilizatoriNum = Number(nrUtilizatori) || 0;
  const mrrNum = Number(mrrSynergo) || 0;
  const previewSaasAnuala = Math.round(mrrNum * 12);
  const previewArr = Math.round(
    (Number(pachetServerAnual) || 0) + (Number(firmaSuplimentara) || 0) + mrrNum * 12
  );
  const previewPretPerUser = nrUtilizatoriNum > 0 ? Math.round(mrrNum / nrUtilizatoriNum) : 0;
  const previewLicentaOnpremise = Math.round(
    (Number(pachetOnpremise) || 0) +
      (Number(licentaCompanie) || 0) +
      (Number(licentaUseri) || 0)
  );
  const previewMentenantaLunara = Math.round((Number(mentenantaPerUser) || 0) * nrUtilizatoriNum);

  function handleStageChange(value: string) {
    setStage(value);
    if (probabilityByStage[value] !== undefined) {
      setProbability(probabilityByStage[value]);
    }
  }

  function handleSubmit(formData: FormData) {
    setSubmitError(null);
    startTransition(async () => {
      if (isEdit) {
        const result = await updateOpportunityAction(opportunity.id, formData);
        if (result.success) {
          router.push(`/oportunitati/${opportunity.id}`);
        } else {
          setSubmitError(result.message ?? "A aparut o eroare la salvare.");
        }
      } else {
        const result = await createOpportunityAction(formData);
        // createOpportunityAction face redirect() intern la succes - daca
        // ajungem aici cu result definit, inseamna ca a fost eroare de validare.
        if (result && !result.success) {
          setSubmitError(result.message ?? "A aparut o eroare la salvare.");
        }
      }
    });
  }

  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <form ref={formRef} action={handleSubmit} className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Stepper */}
      <p className="mb-2 text-center text-xs text-slate-500 sm:hidden">
        Pasul {stepIndex + 1} din {STEPS.length}: {STEPS[stepIndex].label}
      </p>
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <button
              type="button"
              key={step.key}
              onClick={() => setStepIndex(i)}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition ${
                  isActive
                    ? "border-[#E8007A] bg-[#E8007A] text-[#0B0D1A]"
                    : isDone
                    ? "border-[#E8007A]/50 bg-[#E8007A]/10 text-[#E8007A]"
                    : "border-white/10 bg-white/[0.03] text-slate-500"
                }`}
              >
                {isDone ? <Check size={15} /> : <Icon size={15} />}
              </div>
              <span
                className={`hidden text-[11px] transition sm:inline ${
                  isActive ? "text-white font-medium" : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        {/* PAS 1: Firma */}
        <div className={stepIndex === 0 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Identificare firma</h2>
          <p className="mb-4 text-xs text-slate-500">
            Datele de baza ale prospectului / clientului.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nume grup *">
              <TextInput
                name="nume_grup"
                required
                value={numeGrup}
                onChange={(e) => setNumeGrup(e.target.value)}
                placeholder="ex: AAS TRANSFREIGHT"
              />
            </Field>
            <Field label="Nume potential (firma) *">
              <TextInput
                name="nume_potential"
                required
                value={numePotential}
                onChange={(e) => setNumePotential(e.target.value)}
                placeholder="ex: AAS TRANSFREIGHT SRL"
              />
            </Field>
            <Field label="Cod fiscal" hint={!isEdit ? "Completeaza si apasa Cauta pentru auto-completare" : undefined}>
              <div className="flex gap-2">
                <TextInput
                  name="cod_fiscal"
                  value={codFiscal}
                  onChange={(e) => setCodFiscal(e.target.value)}
                />
                {!isEdit && (
                  <button
                    type="button"
                    onClick={handleAnafLookup}
                    disabled={!codFiscal || anafLookupState === "loading"}
                    className="shrink-0 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    {anafLookupState === "loading" ? "..." : "Cauta"}
                  </button>
                )}
              </div>
              {anafLookupState === "done" && (
                <p className="mt-1 text-[11px] text-green-400">
                  Date gasite{anafDomeniuGasit ? ` — Domeniu: ${anafDomeniuGasit}` : ""}.
                </p>
              )}
              {anafLookupState === "error" && (
                <p className="mt-1 text-[11px] text-red-400">
                  {anafLookupError ?? "Nu am gasit date pentru acest CUI."}
                </p>
              )}
            </Field>
            <Field label="Responsabil vanzare">
              <select
                name="responsabil_vanzare_id"
                defaultValue={opportunity?.responsabil_vanzare_id ?? ""}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                <option value="" style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
                  Selecteaza...
                </option>
                {profiles.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    style={{ backgroundColor: "#111535", color: "#F1F5F9" }}
                  >
                    {p.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Domeniul de activitate">
              <Select
                name="domeniul_activitate"
                defaultValue={opportunity?.domeniul_activitate ?? ""}
                options={domeniiActivitate}
              />
            </Field>
            <div />
            <Field label="Judet">
              <select
                name="judet"
                value={judetField}
                onChange={(e) => setJudetField(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                <option value="" style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
                  Selecteaza...
                </option>
                {JUDETE.map((j) => (
                  <option key={j} value={j} style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
                    {j}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Oras">
              <TextInput name="oras" value={orasField} onChange={(e) => setOrasField(e.target.value)} />
            </Field>
            <Field label="Nr angajati">
              <TextInput type="number" name="nr_angajati" defaultValue={opportunity?.nr_angajati ?? ""} />
            </Field>
            <Field label="Cifra de afaceri" hint="Introdusa manual (EUR)">
              <MoneyInput name="cifra_afaceri" defaultValue={opportunity?.cifra_afaceri ?? 0} />
            </Field>
          </div>
        </div>

        {/* PAS 2: Calificare */}
        <div className={stepIndex === 1 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Calificare tehnica</h2>
          <p className="mb-4 text-xs text-slate-500">
            Context tehnic si operational despre prospect.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Solutia existenta">
              <TextInput
                name="solutia_existenta"
                defaultValue={opportunity?.solutia_existenta ?? ""}
                placeholder="ex: WINDNET, 8TEAM, FIRE TMS..."
              />
            </Field>
            <Field label="Produs & serviciu propus">
              <Select
                name="produs_serviciu_propus"
                defaultValue={opportunity?.produs_serviciu_propus ?? "SYNERGO"}
                options={produseServicii}
              />
            </Field>
            <div className="flex gap-6 pt-1">
              <Checkbox
                name="client_novasoft"
                label="Client Novasoft"
                defaultChecked={opportunity?.client_novasoft}
              />
              <Checkbox
                name="client_windsoft"
                label="Client WindSoft"
                defaultChecked={opportunity?.client_windsoft}
              />
            </div>
            <div />
            <Field label="Contabilitate interna">
              <Select
                name="contabilitate_interna"
                defaultValue={opportunity?.contabilitate_interna ?? ""}
                options={DA_NU_NUSTIU}
              />
            </Field>
            <Field label="Solutie contabilitate">
              <TextInput
                name="solutie_contabilitate"
                defaultValue={opportunity?.solutie_contabilitate ?? ""}
                placeholder="ex: SAGA, MENTOR..."
              />
            </Field>
            <Checkbox
              name="mai_multe_firme_grup"
              label="Mai multe firme in grup"
              defaultChecked={opportunity?.mai_multe_firme_grup}
            />
            <Checkbox
              name="potential_fonduri_europene"
              label="Potential fonduri europene"
              defaultChecked={opportunity?.potential_fonduri_europene}
            />
            <Field label="Nr societati suplimentare">
              <TextInput
                type="number"
                name="nr_societati_suplimentare"
                defaultValue={opportunity?.nr_societati_suplimentare ?? ""}
              />
            </Field>
            <Field label="Nume societati suplimentare">
              <TextInput
                name="nume_societati_suplimentare"
                defaultValue={opportunity?.nume_societati_suplimentare ?? ""}
              />
            </Field>
            <Field label="Furnizor combustibil 1">
              <TextInput
                name="furnizori_combustibil_1"
                defaultValue={opportunity?.furnizori_combustibil_1 ?? ""}
              />
            </Field>
            <Field label="Furnizor GPS 1">
              <TextInput
                name="furnizori_gps_1"
                defaultValue={opportunity?.furnizori_gps_1 ?? ""}
              />
            </Field>
            <Field label="Nr vehicule">
              <TextInput
                type="number"
                name="nr_vehicule"
                defaultValue={opportunity?.nr_vehicule ?? ""}
              />
            </Field>
            <Checkbox
              name="interes_planificator"
              label="Interes pentru planificator"
              defaultChecked={opportunity?.interes_planificator}
            />
            <div className="col-span-2">
              <Field label="Detalii suplimentare solutie software">
                <TextArea
                  name="detalii_suplimentare_software"
                  defaultValue={opportunity?.detalii_suplimentare_software ?? ""}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* PAS 3: Pipeline */}
        <div className={stepIndex === 2 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Stadiu pipeline</h2>
          <p className="mb-4 text-xs text-slate-500">
            Unde se afla aceasta oportunitate in procesul de vanzare.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data contactarii">
              <TextInput
                type="date"
                name="data_contactarii"
                defaultValue={toDateInputValue(opportunity?.data_contactarii)}
              />
            </Field>
            <Field label="Tip proiect">
              <Select
                name="tip_proiect"
                defaultValue={opportunity?.tip_proiect ?? ""}
                options={tipuriProiect}
              />
            </Field>
            <Field label="Stage *">
              <Select
                name="stage"
                required
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
                options={valori(stages)}
              />
            </Field>
            <Field label="Probability (sansa de castig)" hint="Se actualizeaza automat la schimbarea Stage-ului, dar poti ajusta manual.">
              <TextInput
                type="number"
                step="0.01"
                min={0}
                max={1}
                name="probability"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
              />
            </Field>
            <Field label="Status *">
              <Select
                name="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={statuses}
              />
            </Field>
            <Field label="Substatus">
              <input
                name="substatus"
                list="substatus-suggestions"
                defaultValue={opportunity?.substatus ?? ""}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
                placeholder="alege sau scrie liber"
              />
              <datalist id="substatus-suggestions">
                {substatusOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <div className="col-span-2">
              <Field label="Motivatia substatusului">
                <TextInput
                  name="motivatia_substatusului"
                  defaultValue={opportunity?.motivatia_substatusului ?? ""}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* PAS 4: Actiune */}
        <div className={stepIndex === 3 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Actiune curenta / follow-up</h2>
          <p className="mb-4 text-xs text-slate-500">
            Ce e de facut in continuare cu aceasta oportunitate.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Actiune">
              <Select
                name="actiune"
                defaultValue={opportunity?.actiune ?? ""}
                options={actiuni}
              />
            </Field>
            <Field label="Status actiune">
              <Select
                name="status_actiune"
                defaultValue={opportunity?.status_actiune ?? ""}
                options={statusActiune}
              />
            </Field>
            <Field label="Data actiune">
              <TextInput
                type="date"
                name="data_actiune"
                defaultValue={toDateInputValue(opportunity?.data_actiune)}
              />
            </Field>
            <Field label="Data finalizare actiune">
              <TextInput
                type="date"
                name="data_finalizare_actiune"
                defaultValue={toDateInputValue(opportunity?.data_finalizare_actiune)}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Observatii actiune">
                <TextArea
                  name="observatii_actiune"
                  defaultValue={opportunity?.observatii_actiune ?? ""}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* PAS 5: Pricing */}
        <div className={stepIndex === 4 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Pricing</h2>
          <p className="mb-4 text-xs text-slate-500">
            Valorile calculate (ARR, Forecast etc) se actualizeaza automat la salvare.
          </p>

          <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => setPricingMode("saas")}
              className={`flex-1 rounded-md py-2 transition ${
                pricingMode === "saas" ? "bg-[#E8007A] font-medium text-[#0B0D1A]" : "text-slate-400"
              }`}
            >
              SaaS
            </button>
            <button
              type="button"
              onClick={() => setPricingMode("onpremise")}
              className={`flex-1 rounded-md py-2 transition ${
                pricingMode === "onpremise"
                  ? "bg-[#E8007A] font-medium text-[#0B0D1A]"
                  : "text-slate-400"
              }`}
            >
              OnPremise
            </button>
          </div>
          <input type="hidden" name="pricing_mode" value={pricingMode} />

          <Field label="Nr utilizatori Synergo">
            <TextInput
              type="number"
              name="nr_utilizatori_synergo"
              value={nrUtilizatori}
              onChange={(e) => setNrUtilizatori(e.target.value)}
            />
          </Field>

          {pricingMode === "saas" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="MRR Synergo" hint="Introdus manual">
                <MoneyInput
                  name="mrr_synergo"
                  value={mrrSynergo}
                  onChange={(e) => setMrrSynergo(e.target.value)}
                />
              </Field>
              <Field label="Valoare pachet server anual" hint="Introdus manual">
                <MoneyInput
                  name="valoare_pachet_server_anual"
                  value={pachetServerAnual}
                  onChange={(e) => setPachetServerAnual(e.target.value)}
                />
              </Field>
              <Field label="Valoare firma suplimentara" hint="Introdus manual">
                <MoneyInput
                  name="valoare_firma_suplimentara"
                  value={firmaSuplimentara}
                  onChange={(e) => setFirmaSuplimentara(e.target.value)}
                />
              </Field>

              <ReadOnlyMoneyField label="Valoare pret / user" value={previewPretPerUser} />
              <ReadOnlyMoneyField label="Valoare SaaS anuala" value={previewSaasAnuala} />
              <ReadOnlyMoneyField label="ARR Synergo" value={previewArr} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Pachet Synergo OnPremise" hint="Introdus manual">
                <MoneyInput
                  name="pachet_synergo_onpremise"
                  value={pachetOnpremise}
                  onChange={(e) => setPachetOnpremise(e.target.value)}
                />
              </Field>
              <Field label="Licenta companie suplimentara" hint="Introdus manual">
                <MoneyInput
                  name="licenta_companie_suplimentara"
                  value={licentaCompanie}
                  onChange={(e) => setLicentaCompanie(e.target.value)}
                />
              </Field>
              <Field label="Licenta useri suplimentari OnPremise" hint="Introdus manual">
                <MoneyInput
                  name="licenta_useri_suplimentari_onpremise"
                  value={licentaUseri}
                  onChange={(e) => setLicentaUseri(e.target.value)}
                />
              </Field>
              <Field label="Mentenanta / user OnPremise" hint="Introdus manual">
                <MoneyInput
                  name="valoare_mentenanta_per_user_onpremise"
                  value={mentenantaPerUser}
                  onChange={(e) => setMentenantaPerUser(e.target.value)}
                />
              </Field>

              <ReadOnlyMoneyField label="Licenta Synergo OnPremise" value={previewLicentaOnpremise} />
              <ReadOnlyMoneyField
                label="Mentenanta lunara OnPremise"
                value={previewMentenantaLunara}
              />
            </div>
          )}

          {/* Campurile din modul inactiv raman in DOM (hidden) pentru a nu pierde
              datele existente la submit, daca utilizatorul comuta modul inainte de salvare. */}
          {pricingMode === "onpremise" && (
            <>
              <input type="hidden" name="mrr_synergo" value={mrrSynergo || "0"} />
              <input type="hidden" name="valoare_pachet_server_anual" value={pachetServerAnual || "0"} />
              <input type="hidden" name="valoare_firma_suplimentara" value={firmaSuplimentara || "0"} />
            </>
          )}
          {pricingMode === "saas" && (
            <>
              <input type="hidden" name="pachet_synergo_onpremise" value={pachetOnpremise || "0"} />
              <input type="hidden" name="licenta_companie_suplimentara" value={licentaCompanie || "0"} />
              <input type="hidden" name="licenta_useri_suplimentari_onpremise" value={licentaUseri || "0"} />
              <input type="hidden" name="valoare_mentenanta_per_user_onpremise" value={mentenantaPerUser || "0"} />
            </>
          )}

          <Field label="Valoare implementare Synergo" hint="Comuna pentru SaaS si OnPremise">
            <MoneyInput
              name="valoare_implementare_synergo"
              defaultValue={opportunity?.valoare_implementare_synergo ?? 0}
            />
          </Field>

          {isEdit && (
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-lg border border-[#E8007A]/20 bg-[#E8007A]/5 p-4">
              {opportunity.forecast_total_saas !== null && (
                <ForecastPreview label="Forecast Total SaaS" value={opportunity.forecast_total_saas} />
              )}
              {opportunity.forecast_total_onpremise !== null && (
                <ForecastPreview
                  label="Forecast Total OnPremise"
                  value={opportunity.forecast_total_onpremise}
                />
              )}
              <ForecastPreview label="Forecast Implementare" value={opportunity.forecast_implementare} />
            </div>
          )}
        </div>

        {/* PAS 6: Sursa */}
        <div className={stepIndex === 5 ? "space-y-4" : "hidden"}>
          <h2 className="mb-1 text-base font-semibold text-white">Sursa & context</h2>
          <p className="mb-4 text-xs text-slate-500">
            De unde a venit aceasta oportunitate si alte observatii.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Canal intrare">
              <Select
                name="canal_intrare"
                defaultValue={opportunity?.canal_intrare ?? ""}
                options={canaleIntrare}
              />
            </Field>
            <Field label="Nume canal intrare">
              <TextInput
                name="nume_canal_intrare"
                defaultValue={opportunity?.nume_canal_intrare ?? ""}
                placeholder="ex: Novasoft, CTE..."
              />
            </Field>
            <div className="col-span-2">
              <Field label="Oportunitati">
                <TextInput
                  name="oportunitati"
                  defaultValue={opportunity?.oportunitati ?? ""}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Feedback">
                <TextArea name="feedback" defaultValue={opportunity?.feedback ?? ""} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Observatii">
                <TextArea name="observatii" defaultValue={opportunity?.observatii ?? ""} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {submitError && (
        <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {submitError}
        </p>
      )}

      {/* Navigare pasi */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={isFirstStep}
          className="flex items-center gap-1 rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft size={15} />
          Inapoi
        </button>

        {isLastStep ? (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#E8007A] px-5 py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            {isPending ? "Se salveaza..." : isEdit ? "Salveaza modificarile" : "Creeaza oportunitate"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            className="flex items-center gap-1 rounded-md bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Inainte
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </form>
  );
}

function ForecastPreview({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-mono text-lg text-[#E8007A]">{formatEur(value)}</p>
    </div>
  );
}

function ReadOnlyMoneyField({ label, value }: { label: string; value: number }) {
  return (
    <Field label={label} hint="Calculat automat">
      <div className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-300">
        <span className="font-mono">{formatEur(value)}</span>
      </div>
    </Field>
  );
}
