"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, Select, MoneyInput } from "@/components/form/fields";
import { formatEur } from "@/lib/format";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { updateOpportunitySectionAction } from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "tip_proiect",
  "pricing_mode",
  "nr_utilizatori_synergo",
  "valoare_implementare_synergo",
  "mrr_synergo",
  "valoare_pachet_server_anual",
  "valoare_firma_suplimentara",
  "pachet_synergo_onpremise",
  "licenta_companie_suplimentara",
  "licenta_useri_suplimentari_onpremise",
  "valoare_mentenanta_per_user_onpremise",
];

export function PricingCard({ o, tipuriProiect }: { o: Opportunity; tipuriProiect: string[] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef, editing);

  const [pricingMode, setPricingMode] = useState<"saas" | "onpremise">(o.pricing_mode);
  const [nrUtilizatori, setNrUtilizatori] = useState(String(o.nr_utilizatori_synergo ?? ""));
  const [mrrSynergo, setMrrSynergo] = useState(String(o.mrr_synergo ?? ""));
  const [pachetServerAnual, setPachetServerAnual] = useState(
    String(o.valoare_pachet_server_anual ?? "")
  );
  const [firmaSuplimentara, setFirmaSuplimentara] = useState(
    String(o.valoare_firma_suplimentara ?? "")
  );
  const [pachetOnpremise, setPachetOnpremise] = useState(String(o.pachet_synergo_onpremise ?? ""));
  const [licentaCompanie, setLicentaCompanie] = useState(
    String(o.licenta_companie_suplimentara ?? "")
  );
  const [licentaUseri, setLicentaUseri] = useState(
    String(o.licenta_useri_suplimentari_onpremise ?? "")
  );
  const [mentenantaPerUser, setMentenantaPerUser] = useState(
    String(o.valoare_mentenanta_per_user_onpremise ?? "")
  );

  const nrUtilizatoriNum = Number(nrUtilizatori) || 0;
  const mrrNum = Number(mrrSynergo) || 0;
  const previewSaasAnuala = Math.round(mrrNum * 12);
  const previewArr = Math.round(
    (Number(pachetServerAnual) || 0) + (Number(firmaSuplimentara) || 0) + mrrNum * 12
  );
  const previewPretPerUser = nrUtilizatoriNum > 0 ? Math.round(mrrNum / nrUtilizatoriNum) : 0;
  const previewLicentaOnpremise = Math.round(
    (Number(pachetOnpremise) || 0) + (Number(licentaCompanie) || 0) + (Number(licentaUseri) || 0)
  );
  const previewMentenantaLunara = Math.round((Number(mentenantaPerUser) || 0) * nrUtilizatoriNum);

  function handleSubmit(formData: FormData) {
    formData.set("__fields", FIELDS.join(","));
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateOpportunitySectionAction(o.id, formData);
        if (result.success) {
          setEditing(false);
        } else {
          setError(result.message ?? "A aparut o eroare la salvare.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "A aparut o eroare la salvare.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Pricing</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-text-muted transition hover:bg-surface-1 hover:text-[#E8007A]"
            title="Editeaza Pricing"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <form ref={formRef} action={handleSubmit} className="space-y-3">
          <LabeledInput label="Tip proiect">
            <Select name="tip_proiect" defaultValue={o.tip_proiect ?? ""} options={tipuriProiect} />
          </LabeledInput>

          <div className="flex gap-1 rounded-lg bg-surface-1 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPricingMode("saas")}
              className={`flex-1 rounded-md py-1.5 transition ${
                pricingMode === "saas" ? "bg-[#E8007A] font-medium text-[#0B0D1A]" : "text-text-secondary"
              }`}
            >
              SaaS
            </button>
            <button
              type="button"
              onClick={() => setPricingMode("onpremise")}
              className={`flex-1 rounded-md py-1.5 transition ${
                pricingMode === "onpremise"
                  ? "bg-[#E8007A] font-medium text-[#0B0D1A]"
                  : "text-text-secondary"
              }`}
            >
              OnPremise
            </button>
          </div>
          <input type="hidden" name="pricing_mode" value={pricingMode} />

          <LabeledInput label="Nr utilizatori Synergo">
            <TextInput
              type="number"
              name="nr_utilizatori_synergo"
              value={nrUtilizatori}
              onChange={(e) => setNrUtilizatori(e.target.value)}
            />
          </LabeledInput>

          {pricingMode === "saas" ? (
            <>
              <LabeledInput label="MRR Synergo">
                <MoneyInput
                  name="mrr_synergo"
                  value={mrrSynergo}
                  onChange={(e) => setMrrSynergo(e.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Valoare pachet server anual">
                <MoneyInput
                  name="valoare_pachet_server_anual"
                  value={pachetServerAnual}
                  onChange={(e) => setPachetServerAnual(e.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Valoare firma suplimentara">
                <MoneyInput
                  name="valoare_firma_suplimentara"
                  value={firmaSuplimentara}
                  onChange={(e) => setFirmaSuplimentara(e.target.value)}
                />
              </LabeledInput>
              <ReadOnlyRow label="Valoare pret / user" value={previewPretPerUser} />
              <ReadOnlyRow label="Valoare SaaS anuala" value={previewSaasAnuala} />
              <ReadOnlyRow label="ARR Synergo" value={previewArr} />

              <input type="hidden" name="pachet_synergo_onpremise" value={pachetOnpremise || "0"} />
              <input
                type="hidden"
                name="licenta_companie_suplimentara"
                value={licentaCompanie || "0"}
              />
              <input type="hidden" name="licenta_useri_suplimentari_onpremise" value={licentaUseri || "0"} />
              <input
                type="hidden"
                name="valoare_mentenanta_per_user_onpremise"
                value={mentenantaPerUser || "0"}
              />
            </>
          ) : (
            <>
              <LabeledInput label="Pachet Synergo OnPremise">
                <MoneyInput
                  name="pachet_synergo_onpremise"
                  value={pachetOnpremise}
                  onChange={(e) => setPachetOnpremise(e.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Licenta companie suplimentara">
                <MoneyInput
                  name="licenta_companie_suplimentara"
                  value={licentaCompanie}
                  onChange={(e) => setLicentaCompanie(e.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Licenta useri suplimentari OnPremise">
                <MoneyInput
                  name="licenta_useri_suplimentari_onpremise"
                  value={licentaUseri}
                  onChange={(e) => setLicentaUseri(e.target.value)}
                />
              </LabeledInput>
              <LabeledInput label="Mentenanta / user OnPremise">
                <MoneyInput
                  name="valoare_mentenanta_per_user_onpremise"
                  value={mentenantaPerUser}
                  onChange={(e) => setMentenantaPerUser(e.target.value)}
                />
              </LabeledInput>
              <ReadOnlyRow label="Licenta Synergo OnPremise" value={previewLicentaOnpremise} />
              <ReadOnlyRow label="Mentenanta lunara OnPremise" value={previewMentenantaLunara} />

              <input type="hidden" name="mrr_synergo" value={mrrSynergo || "0"} />
              <input
                type="hidden"
                name="valoare_pachet_server_anual"
                value={pachetServerAnual || "0"}
              />
              <input
                type="hidden"
                name="valoare_firma_suplimentara"
                value={firmaSuplimentara || "0"}
              />
            </>
          )}

          <LabeledInput label="Valoare implementare Synergo">
            <MoneyInput
              name="valoare_implementare_synergo"
              defaultValue={o.valoare_implementare_synergo}
            />
          </LabeledInput>

          {error && (
            <p className="rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1 rounded-md bg-[#E8007A] px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
              title="Salveaza (Ctrl+S)"
            >
              <Check size={13} />
              {isPending ? "Se salveaza..." : "Salveaza"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
            >
              <X size={13} />
              Anuleaza
            </button>
          </div>
        </form>
      ) : (
        <div className="divide-y divide-white/5">
          <InfoRow label="Tip proiect" value={o.tip_proiect} />
          <InfoRow
            label="Mod pricing"
            value={o.pricing_mode === "saas" ? "SaaS" : "OnPremise"}
          />
          <InfoRow label="Nr utilizatori Synergo" value={o.nr_utilizatori_synergo} />
          {o.pricing_mode === "saas" ? (
            <>
              <InfoRow label="MRR Synergo" value={formatEur(o.mrr_synergo)} />
              <InfoRow label="Valoare pret / user" value={formatEur(o.valoare_pret_per_user)} />
              <InfoRow label="Valoare SaaS anuala" value={formatEur(o.valoare_saas_anuala)} />
              <InfoRow
                label="Valoare pachet server anual"
                value={formatEur(o.valoare_pachet_server_anual)}
              />
              <InfoRow
                label="Valoare firma suplimentara"
                value={formatEur(o.valoare_firma_suplimentara)}
              />
              <InfoRow label="ARR Synergo" value={formatEur(o.arr_synergo)} />
            </>
          ) : (
            <>
              <InfoRow
                label="Pachet Synergo OnPremise"
                value={formatEur(o.pachet_synergo_onpremise)}
              />
              <InfoRow
                label="Licenta companie suplimentara"
                value={formatEur(o.licenta_companie_suplimentara)}
              />
              <InfoRow
                label="Licenta useri suplimentari"
                value={formatEur(o.licenta_useri_suplimentari_onpremise)}
              />
              <InfoRow
                label="Licenta Synergo OnPremise"
                value={formatEur(o.licenta_synergo_onpremise)}
              />
              <InfoRow
                label="Mentenanta / user OnPremise"
                value={formatEur(o.valoare_mentenanta_per_user_onpremise)}
              />
              <InfoRow
                label="Mentenanta lunara OnPremise"
                value={formatEur(o.valoare_mentenanta_lunara_onpremise)}
              />
            </>
          )}
          <InfoRow label="Valoare implementare" value={formatEur(o.valoare_implementare_synergo)} />
          {o.forecast_total_saas !== null && (
            <InfoRow label="Forecast Total SaaS" value={formatEur(o.forecast_total_saas)} />
          )}
          {o.forecast_total_onpremise !== null && (
            <InfoRow
              label="Forecast Total OnPremise"
              value={formatEur(o.forecast_total_onpremise)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: number }) {
  return (
    <LabeledInput label={`${label} (calculat)`}>
      <div className="rounded-md border border-border-faint bg-surface-1 px-2.5 py-1.5 font-mono text-sm text-text-primary">
        {formatEur(value)}
      </div>
    </LabeledInput>
  );
}
