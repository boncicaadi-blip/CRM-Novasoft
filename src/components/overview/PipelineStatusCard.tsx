"use client";

import { useState } from "react";
import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, Select } from "@/components/form/fields";
import { SUBSTATUS_SUGGESTIONS } from "@/lib/constants";
import type { Nomenclator, Opportunity } from "@/types/opportunity";

const FIELDS = [
  "data_contactarii",
  "stage",
  "status",
  "substatus",
  "motivatia_substatusului",
  "probability",
];

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ro-RO");
}

function toDateInputValue(v: string | null | undefined) {
  if (!v) return "";
  return v.slice(0, 10);
}

export function PipelineStatusCard({
  o,
  stages,
  statuses,
}: {
  o: Opportunity;
  stages: Nomenclator[];
  statuses: string[];
}) {
  const [stage, setStage] = useState(o.stage);
  const [status, setStatus] = useState(o.status);
  const [probability, setProbability] = useState(o.probability ?? 0);

  const probabilityByStage: Record<string, number> = {};
  for (const s of stages) {
    if (s.probability !== null) probabilityByStage[s.valoare] = s.probability;
  }

  function handleStageChange(value: string) {
    setStage(value);
    if (probabilityByStage[value] !== undefined) {
      setProbability(probabilityByStage[value]);
    }
  }

  const substatusOptions = SUBSTATUS_SUGGESTIONS[status] ?? [];

  return (
    <EditableCard
      title="Pipeline & status"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Data contactarii" value={fmtDate(o.data_contactarii)} />
          <InfoRow label="Stage" value={o.stage} />
          <InfoRow label="Status" value={o.status} />
          <InfoRow label="Substatus" value={o.substatus} />
          <InfoRow label="Motivatia substatusului" value={o.motivatia_substatusului} />
          <InfoRow label="Probability" value={`${Math.round((o.probability ?? 0) * 100)}%`} />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Data contactarii">
            <TextInput
              type="date"
              name="data_contactarii"
              defaultValue={toDateInputValue(o.data_contactarii)}
            />
          </LabeledInput>
          <LabeledInput label="Stage">
            <Select
              name="stage"
              value={stage}
              onChange={(e) => handleStageChange(e.target.value)}
              options={stages.map((s) => s.valoare)}
            />
          </LabeledInput>
          <LabeledInput label="Status">
            <Select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={statuses}
            />
          </LabeledInput>
          <LabeledInput label="Substatus">
            <input
              name="substatus"
              list="substatus-suggestions-inline"
              defaultValue={o.substatus ?? ""}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
            />
            <datalist id="substatus-suggestions-inline">
              {substatusOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </LabeledInput>
          <LabeledInput label="Motivatia substatusului">
            <TextInput
              name="motivatia_substatusului"
              defaultValue={o.motivatia_substatusului ?? ""}
            />
          </LabeledInput>
          <LabeledInput label="Probability (0-1)">
            <TextInput
              type="number"
              step="0.01"
              min={0}
              max={1}
              name="probability"
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
            />
          </LabeledInput>
        </>
      }
    />
  );
}
