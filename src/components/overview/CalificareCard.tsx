"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, TextArea, Select, Checkbox } from "@/components/form/fields";
import { DA_NU_NUSTIU } from "@/lib/constants";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "solutia_existenta",
  "client_novasoft",
  "client_windsoft",
  "facturabil",
  "produs_serviciu_propus",
  "contabilitate_interna",
  "solutie_contabilitate",
  "mai_multe_firme_grup",
  "nr_societati_suplimentare",
  "nume_societati_suplimentare",
  "furnizori_combustibil_1",
  "furnizori_combustibil_2",
  "furnizori_combustibil_3",
  "furnizori_gps_1",
  "furnizori_gps_2",
  "nr_vehicule",
  "interes_planificator",
  "potential_fonduri_europene",
  "detalii_suplimentare_software",
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
          <InfoRow label="Client Novasoft" value={yesNo(o.client_novasoft)} />
          <InfoRow label="Client WindSoft" value={yesNo(o.client_windsoft)} />
          <InfoRow label="Facturabil" value={yesNo(o.facturabil)} />
          <InfoRow label="Produs propus" value={o.produs_serviciu_propus} />
          <InfoRow label="Contabilitate interna" value={o.contabilitate_interna} />
          <InfoRow label="Solutie contabilitate" value={o.solutie_contabilitate} />
          <InfoRow label="Mai multe firme in grup" value={yesNo(o.mai_multe_firme_grup)} />
          <InfoRow label="Nr societati suplimentare" value={o.nr_societati_suplimentare} />
          <InfoRow label="Nume societati suplimentare" value={o.nume_societati_suplimentare} />
          <InfoRow label="Furnizor combustibil 1" value={o.furnizori_combustibil_1} />
          <InfoRow label="Furnizor combustibil 2" value={o.furnizori_combustibil_2} />
          <InfoRow label="Furnizor combustibil 3" value={o.furnizori_combustibil_3} />
          <InfoRow label="Furnizor GPS 1" value={o.furnizori_gps_1} />
          <InfoRow label="Furnizor GPS 2" value={o.furnizori_gps_2} />
          <InfoRow label="Nr vehicule" value={o.nr_vehicule} />
          <InfoRow label="Interes planificator" value={yesNo(o.interes_planificator)} />
          <InfoRow label="Potential fonduri europene" value={yesNo(o.potential_fonduri_europene)} />
          <InfoRow label="Detalii suplimentare solutie software" value={o.detalii_suplimentare_software} />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Solutia existenta">
            <TextInput name="solutia_existenta" defaultValue={o.solutia_existenta ?? ""} />
          </LabeledInput>
          <div className="flex gap-4">
            <Checkbox
              name="client_novasoft"
              label="Client Novasoft"
              defaultChecked={o.client_novasoft}
            />
            <Checkbox
              name="client_windsoft"
              label="Client WindSoft"
              defaultChecked={o.client_windsoft}
            />
          </div>
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
          <LabeledInput label="Nr societati suplimentare">
            <TextInput type="number" name="nr_societati_suplimentare" defaultValue={o.nr_societati_suplimentare ?? ""} />
          </LabeledInput>
          <LabeledInput label="Nume societati suplimentare">
            <TextInput name="nume_societati_suplimentare" defaultValue={o.nume_societati_suplimentare ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor combustibil 1">
            <TextInput name="furnizori_combustibil_1" defaultValue={o.furnizori_combustibil_1 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor combustibil 2">
            <TextInput name="furnizori_combustibil_2" defaultValue={o.furnizori_combustibil_2 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor combustibil 3">
            <TextInput name="furnizori_combustibil_3" defaultValue={o.furnizori_combustibil_3 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor GPS 1">
            <TextInput name="furnizori_gps_1" defaultValue={o.furnizori_gps_1 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Furnizor GPS 2">
            <TextInput name="furnizori_gps_2" defaultValue={o.furnizori_gps_2 ?? ""} />
          </LabeledInput>
          <LabeledInput label="Nr vehicule">
            <TextInput type="number" name="nr_vehicule" defaultValue={o.nr_vehicule ?? ""} />
          </LabeledInput>
          <Checkbox
            name="interes_planificator"
            label="Interes planificator"
            defaultChecked={o.interes_planificator}
          />
          <Checkbox
            name="potential_fonduri_europene"
            label="Potential fonduri europene"
            defaultChecked={o.potential_fonduri_europene}
          />
          <LabeledInput label="Detalii suplimentare solutie software">
            <TextArea name="detalii_suplimentare_software" defaultValue={o.detalii_suplimentare_software ?? ""} />
          </LabeledInput>
        </>
      }
    />
  );
}
