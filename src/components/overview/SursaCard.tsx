"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, TextArea, Select } from "@/components/form/fields";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = ["canal_intrare", "nume_canal_intrare", "oportunitati", "feedback", "observatii"];

export function SursaCard({ o, canaleIntrare }: { o: Opportunity; canaleIntrare: string[] }) {
  return (
    <EditableCard
      title="Sursa & context"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Canal intrare" value={o.canal_intrare} />
          <InfoRow label="Nume canal intrare" value={o.nume_canal_intrare} />
          <InfoRow label="Oportunitati" value={o.oportunitati} />
          {o.feedback && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Feedback</span>
              <p className="mt-1 text-sm text-slate-300">{o.feedback}</p>
            </div>
          )}
          {o.observatii && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Observatii</span>
              <p className="mt-1 text-sm text-slate-300">{o.observatii}</p>
            </div>
          )}
        </>
      }
      editContent={
        <>
          <LabeledInput label="Canal intrare">
            <Select name="canal_intrare" defaultValue={o.canal_intrare ?? ""} options={canaleIntrare} />
          </LabeledInput>
          <LabeledInput label="Nume canal intrare">
            <TextInput name="nume_canal_intrare" defaultValue={o.nume_canal_intrare ?? ""} />
          </LabeledInput>
          <LabeledInput label="Oportunitati">
            <TextInput name="oportunitati" defaultValue={o.oportunitati ?? ""} />
          </LabeledInput>
          <LabeledInput label="Feedback">
            <TextArea name="feedback" defaultValue={o.feedback ?? ""} />
          </LabeledInput>
          <LabeledInput label="Observatii">
            <TextArea name="observatii" defaultValue={o.observatii ?? ""} />
          </LabeledInput>
        </>
      }
    />
  );
}
