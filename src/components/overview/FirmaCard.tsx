"use client";

import { EditableCard } from "@/components/overview/EditableCard";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, Select } from "@/components/form/fields";
import { JUDETE } from "@/lib/constants";
import type { Opportunity, Profile } from "@/types/opportunity";

const FIELDS = [
  "nume_grup",
  "nume_potential",
  "cod_fiscal",
  "responsabil_vanzare_id",
  "domeniul_activitate",
  "judet",
  "oras",
];

export function FirmaCard({
  o,
  profiles,
  domeniiActivitate,
}: {
  o: Opportunity;
  profiles: Profile[];
  domeniiActivitate: string[];
}) {
  return (
    <EditableCard
      title="Firma"
      opportunityId={o.id}
      fields={FIELDS}
      viewContent={
        <>
          <InfoRow label="Nume grup" value={o.nume_grup} />
          <InfoRow label="Nume potential" value={o.nume_potential} />
          <InfoRow label="Cod fiscal" value={o.cod_fiscal} />
          <InfoRow label="Responsabil vanzare" value={o.profiles?.full_name} />
          <InfoRow label="Domeniu activitate" value={o.domeniul_activitate} />
          <InfoRow label="Judet" value={o.judet} />
          <InfoRow label="Oras" value={o.oras} />
        </>
      }
      editContent={
        <>
          <LabeledInput label="Nume grup">
            <TextInput name="nume_grup" defaultValue={o.nume_grup} required />
          </LabeledInput>
          <LabeledInput label="Nume potential">
            <TextInput name="nume_potential" defaultValue={o.nume_potential} required />
          </LabeledInput>
          <LabeledInput label="Cod fiscal">
            <TextInput name="cod_fiscal" defaultValue={o.cod_fiscal ?? ""} />
          </LabeledInput>
          <LabeledInput label="Responsabil vanzare">
            <select
              name="responsabil_vanzare_id"
              defaultValue={o.responsabil_vanzare_id ?? ""}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
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
          </LabeledInput>
          <LabeledInput label="Domeniu activitate">
            <Select
              name="domeniul_activitate"
              defaultValue={o.domeniul_activitate ?? ""}
              options={domeniiActivitate}
            />
          </LabeledInput>
          <LabeledInput label="Judet">
            <Select name="judet" defaultValue={o.judet ?? ""} options={JUDETE} />
          </LabeledInput>
          <LabeledInput label="Oras">
            <TextInput name="oras" defaultValue={o.oras ?? ""} />
          </LabeledInput>
        </>
      }
    />
  );
}
