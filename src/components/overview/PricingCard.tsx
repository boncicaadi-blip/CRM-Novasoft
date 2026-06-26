"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, Select, MoneyInput } from "@/components/form/fields";
import { formatEur } from "@/lib/format";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "tip_proiect",
  "nr_utilizatori_synergo",
  "valoare_pret_per_user",
  "valoare_implementare_synergo",
  "valoare_saas_anuala",
  "arr_synergo",
  "mrr_synergo",
  "valoare_pachet_server_anual",
  "valoare_firma_suplimentara",
  "pachet_synergo_onpremise",
  "licenta_companie_suplimentara",
  "licenta_useri_suplimentari_onpremise",
  "licenta_synergo_onpremise",
  "valoare_mentenanta_per_user_onpremise",
  "valoare_mentenanta_lunara_onpremise",
];

export function PricingCard({ o, tipuriProiect }: { o: Opportunity; tipuriProiect: string[] }) {
  return (
    <EditableCard
      title="Pricing"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Tip proiect" value={o.tip_proiect} />
          <InfoRow label="Nr utilizatori Synergo" value={o.nr_utilizatori_synergo} />
          <InfoRow label="Valoare pret / user" value={formatEur(o.valoare_pret_per_user)} />
          <InfoRow
            label="Valoare implementare"
            value={formatEur(o.valoare_implementare_synergo)}
          />
          <InfoRow label="Valoare SaaS anuala" value={formatEur(o.valoare_saas_anuala)} />
          <InfoRow label="ARR Synergo" value={formatEur(o.arr_synergo)} />
          <InfoRow label="MRR Synergo" value={formatEur(o.mrr_synergo)} />
          <InfoRow
            label="Licenta Synergo OnPremise"
            value={formatEur(o.licenta_synergo_onpremise)}
          />
          <InfoRow
            label="Mentenanta lunara OnPremise"
            value={formatEur(o.valoare_mentenanta_lunara_onpremise)}
          />
          <InfoRow label="Forecast Total SaaS" value={formatEur(o.forecast_total_saas)} />
          <InfoRow
            label="Forecast Total OnPremise"
            value={formatEur(o.forecast_total_onpremise)}
          />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Tip proiect">
            <Select name="tip_proiect" defaultValue={o.tip_proiect ?? ""} options={tipuriProiect} />
          </LabeledInput>
          <LabeledInput label="Nr utilizatori Synergo">
            <TextInput
              type="number"
              name="nr_utilizatori_synergo"
              defaultValue={o.nr_utilizatori_synergo ?? ""}
            />
          </LabeledInput>
          <LabeledInput label="Valoare pret / user">
            <MoneyInput name="valoare_pret_per_user" defaultValue={o.valoare_pret_per_user} />
          </LabeledInput>
          <LabeledInput label="Valoare implementare">
            <MoneyInput
              name="valoare_implementare_synergo"
              defaultValue={o.valoare_implementare_synergo}
            />
          </LabeledInput>
          <LabeledInput label="Valoare SaaS anuala">
            <MoneyInput name="valoare_saas_anuala" defaultValue={o.valoare_saas_anuala} />
          </LabeledInput>
          <LabeledInput label="ARR Synergo">
            <MoneyInput name="arr_synergo" defaultValue={o.arr_synergo} />
          </LabeledInput>
          <LabeledInput label="MRR Synergo">
            <MoneyInput name="mrr_synergo" defaultValue={o.mrr_synergo} />
          </LabeledInput>
          <LabeledInput label="Valoare pachet server anual">
            <MoneyInput
              name="valoare_pachet_server_anual"
              defaultValue={o.valoare_pachet_server_anual}
            />
          </LabeledInput>
          <LabeledInput label="Valoare firma suplimentara">
            <MoneyInput
              name="valoare_firma_suplimentara"
              defaultValue={o.valoare_firma_suplimentara}
            />
          </LabeledInput>
          <LabeledInput label="Pachet Synergo OnPremise">
            <MoneyInput
              name="pachet_synergo_onpremise"
              defaultValue={o.pachet_synergo_onpremise}
            />
          </LabeledInput>
          <LabeledInput label="Licenta Synergo OnPremise">
            <MoneyInput
              name="licenta_synergo_onpremise"
              defaultValue={o.licenta_synergo_onpremise}
            />
          </LabeledInput>
          <LabeledInput label="Licenta companie suplimentara">
            <MoneyInput
              name="licenta_companie_suplimentara"
              defaultValue={o.licenta_companie_suplimentara}
            />
          </LabeledInput>
          <LabeledInput label="Licenta useri suplimentari OnPremise">
            <MoneyInput
              name="licenta_useri_suplimentari_onpremise"
              defaultValue={o.licenta_useri_suplimentari_onpremise}
            />
          </LabeledInput>
          <LabeledInput label="Mentenanta / user OnPremise">
            <MoneyInput
              name="valoare_mentenanta_per_user_onpremise"
              defaultValue={o.valoare_mentenanta_per_user_onpremise}
            />
          </LabeledInput>
          <LabeledInput label="Mentenanta lunara OnPremise">
            <MoneyInput
              name="valoare_mentenanta_lunara_onpremise"
              defaultValue={o.valoare_mentenanta_lunara_onpremise}
            />
          </LabeledInput>
        </>
      }
    />
  );
}
