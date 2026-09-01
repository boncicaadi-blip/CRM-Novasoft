"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { Select, Checkbox } from "@/components/form/fields";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = ["produs_serviciu_propus", "interes_planificator"];

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
      title="Calificare"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Produs propus" value={o.produs_serviciu_propus} />
          <InfoRow label="Interes planificator" value={yesNo(o.interes_planificator)} />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Produs propus">
            <Select
              name="produs_serviciu_propus"
              defaultValue={o.produs_serviciu_propus ?? ""}
              options={produseServicii}
            />
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
