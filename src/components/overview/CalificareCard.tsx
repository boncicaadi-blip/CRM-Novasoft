"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, Select, Checkbox } from "@/components/form/fields";
import { DA_NU_NUSTIU } from "@/lib/constants";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "solutia_existenta",
  "facturabil",
  "produs_serviciu_propus",
  "contabilitate_interna",
  "solutie_contabilitate",
  "mai_multe_firme_grup",
  "furnizori_combustibil_1",
  "furnizori_gps_1",
  "interes_planificator",
];

function yesNo(value: boolean) {
  return value ? "Da" : "Nu";
}

export function CalificareCard({
  o,
  produseServicii,
}: {
  o: Opportunity;
  produseServicii: string[];
}) {
  return (
    <EditableCard
      title="Calificare tehnica"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Solutia existenta" value={o.solutia_existenta} />
          <InfoRow label="Facturabil" value={yesNo(o.facturabil)} />
          <InfoRow label="Produs propus" value={o.produs_serviciu_propus} />
          <InfoRow label="Contabilitate interna" value={o.contabilitate_interna} />
          <InfoRow label="Solutie contabilitate" value={o.solutie_contabilitate} />
          <InfoRow label="Mai multe firme in grup" value={yesNo(o.mai_multe_firme_grup)} />
          <InfoRow label="Furnizor combustibil" value={o.furnizori_combustibil_1} />
          <InfoRow label="Furnizor GPS" value={o.furnizori_gps_1} />
          <InfoRow label="Interes planificator" value={yesNo(o.interes_planificator)} />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Solutia existenta">
            <TextInput name="solutia_existenta" defaultValue={o.solutia_existenta ?? ""} />
          </LabeledInput>
          <div>
            <Checkbox name="facturabil" label="Facturabil" defaultChecked={o.facturabil} />
            <p className="mt-1 text-[11px] text-text-muted">
              Bifeaza cand aceasta oportunitate reprezinta o vanzare reala, facturabila - apare
              atunci in selectorul de client la Contracte (Venituri). Independent de stage - util
              pentru up-sell/cross-sell pe un client existent, fara sa treci printr-un flux nou de
              pipeline.
            </p>
          </div>
          <LabeledInput label="Produs propus">
            <Select
              name="produs_serviciu_propus"
              defaultValue={o.produs_serviciu_propus ?? ""}
              options={produseServicii}
            />
          </LabeledInput>
          <LabeledInput label="Contabilitate interna">
            <Select
              name="contabilitate_interna"
              defaultValue={o.contabilitate_interna ?? ""}
              options={DA_NU_NUSTIU}
            />
          </LabeledInput>
          <LabeledInput label="Solutie contabilitate">
            <TextInput name="solutie_contabilitate" defaultValue={o.solutie_contabilitate ?? ""} />
          </LabeledInput>
          <Checkbox
            name="mai_multe_firme_grup"
            label="Mai multe firme in grup"
            defaultChecked={o.mai_multe_firme_grup}
          />
          <LabeledInput label="Furnizor combustibil">
            <TextInput name="furnizori_combustibil_1" defaultValue={o.furnizori_combustibil_1 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor GPS">
            <TextInput name="furnizori_gps_1" defaultValue={o.furnizori_gps_1 ?? ""} />
          </LabeledInput>
          <Checkbox
            name="interes_planificator"
            label="Interes planificator"
            defaultChecked={o.interes_planificator}
          />
        </>
      }
    />
  );
}
