"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, TextArea, Select } from "@/components/form/fields";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "actiune",
  "status_actiune",
  "data_actiune",
  "data_finalizare_actiune",
  "observatii_actiune",
];

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ro-RO");
}

function toDateInputValue(v: string | null | undefined) {
  if (!v) return "";
  return v.slice(0, 10);
}

export function ActiuneCard({
  o,
  actiuni,
  statusActiune,
}: {
  o: Opportunity;
  actiuni: string[];
  statusActiune: string[];
}) {
  return (
    <EditableCard
      title="Actiune curenta"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Actiune" value={o.actiune} />
          <InfoRow label="Status actiune" value={o.status_actiune} />
          <InfoRow label="Data actiune" value={fmtDate(o.data_actiune)} />
          <InfoRow label="Data finalizare" value={fmtDate(o.data_finalizare_actiune)} />
          {o.observatii_actiune && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Observatii actiune</span>
              <p className="mt-1 text-sm text-slate-300">{o.observatii_actiune}</p>
            </div>
          )}
        </>
      }
      editContent={
        <>
          <LabeledInput label="Actiune">
            <Select name="actiune" defaultValue={o.actiune ?? ""} options={actiuni} />
          </LabeledInput>
          <LabeledInput label="Status actiune">
            <Select
              name="status_actiune"
              defaultValue={o.status_actiune ?? ""}
              options={statusActiune}
            />
          </LabeledInput>
          <LabeledInput label="Data actiune">
            <TextInput
              type="date"
              name="data_actiune"
              defaultValue={toDateInputValue(o.data_actiune)}
            />
          </LabeledInput>
          <LabeledInput label="Data finalizare">
            <TextInput
              type="date"
              name="data_finalizare_actiune"
              defaultValue={toDateInputValue(o.data_finalizare_actiune)}
            />
          </LabeledInput>
          <LabeledInput label="Observatii actiune">
            <TextArea name="observatii_actiune" defaultValue={o.observatii_actiune ?? ""} />
          </LabeledInput>
        </>
      }
    />
  );
}
