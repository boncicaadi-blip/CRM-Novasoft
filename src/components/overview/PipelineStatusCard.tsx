"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput } from "@/components/form/fields";
import { SUBSTATUS_SUGGESTIONS, STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { updateOpportunitySectionAction } from "@/lib/actions/opportunities";
import type { Nomenclator, Opportunity } from "@/types/opportunity";

const FIELDS = [
  "data_contactarii",
  "stage_id",
  "status_id",
  "substatus",
  "motivatia_substatusului",
  "probability",
  "motiv_pierdere_id",
  "motiv_amanare_id",
  "data_revenire",
];

const optionStyle = { backgroundColor: "#111535", color: "#F1F5F9" };

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
  statusuri,
  motivePierdere,
  motiveAmanare,
}: {
  o: Opportunity;
  stages: Nomenclator[];
  statusuri: Nomenclator[];
  motivePierdere: Nomenclator[];
  motiveAmanare: Nomenclator[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef, editing);

  const [stageId, setStageId] = useState(o.stage_id ?? "");
  const [statusId, setStatusId] = useState(o.status_id ?? "");
  const [probability, setProbability] = useState(o.probability ?? 0);

  const stageColor =
    stages.find((s) => s.id === stageId)?.culoare ?? STAGE_COLORS[o.stage] ?? "#94A3B8";
  const statusColor =
    statusuri.find((s) => s.id === statusId)?.culoare ?? STATUS_COLORS[o.status] ?? "#94A3B8";

  const currentStatusValoare = statusuri.find((s) => s.id === statusId)?.valoare ?? o.status;
  const substatusOptions = SUBSTATUS_SUGGESTIONS[currentStatusValoare] ?? [];

  function handleStageChange(id: string) {
    setStageId(id);
    const probabilityForStage = stages.find((s) => s.id === id)?.probability;
    if (probabilityForStage !== null && probabilityForStage !== undefined) {
      setProbability(probabilityForStage);
    }
  }

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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Pipeline & status
        </p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-[#E8007A]"
            title="Editeaza Pipeline & status"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <form ref={formRef} action={handleSubmit} className="space-y-2.5">
          <LabeledInput label="Data contactarii">
            <TextInput
              type="date"
              name="data_contactarii"
              defaultValue={toDateInputValue(o.data_contactarii)}
            />
          </LabeledInput>

          <LabeledInput label="Stage">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stageColor }}
              />
              <select
                name="stage_id"
                value={stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id} style={optionStyle}>
                    {s.valoare}
                  </option>
                ))}
              </select>
            </div>
          </LabeledInput>

          <LabeledInput label="Status">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              <select
                name="status_id"
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                {statusuri.map((s) => (
                  <option key={s.id} value={s.id} style={optionStyle}>
                    {s.valoare}
                  </option>
                ))}
              </select>
            </div>
          </LabeledInput>

          {currentStatusValoare === "Pierduta" && (
            <LabeledInput label="Motiv pierdere *">
              <select
                name="motiv_pierdere_id"
                defaultValue={o.motiv_pierdere_id ?? ""}
                className="w-full rounded-md border border-[#E8007A]/40 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                <option value="" style={optionStyle}>
                  Selecteaza...
                </option>
                {motivePierdere.map((m) => (
                  <option key={m.id} value={m.id} style={optionStyle}>
                    {m.valoare}
                  </option>
                ))}
              </select>
            </LabeledInput>
          )}

          {currentStatusValoare === "Amanata" && (
            <>
              <LabeledInput label="Motiv amanare *">
                <select
                  name="motiv_amanare_id"
                  defaultValue={o.motiv_amanare_id ?? ""}
                  className="w-full rounded-md border border-[#E8007A]/40 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
                >
                  <option value="" style={optionStyle}>
                    Selecteaza...
                  </option>
                  {motiveAmanare.map((m) => (
                    <option key={m.id} value={m.id} style={optionStyle}>
                      {m.valoare}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              <LabeledInput label="Data revenire *">
                <TextInput
                  type="date"
                  name="data_revenire"
                  defaultValue={toDateInputValue(o.data_revenire)}
                  className="border-[#E8007A]/40"
                />
              </LabeledInput>
            </>
          )}

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

          {currentStatusValoare === "Activa" && (
            <p className="rounded-md bg-[#0070F3]/10 px-2.5 py-2 text-[11px] text-[#0070F3]">
              Status Activa necesita Actiune, Data actiunii si Responsabil completate (caseta
              &quot;Actiune curenta&quot;).
            </p>
          )}

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
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
            >
              <X size={13} />
              Anuleaza
            </button>
          </div>
        </form>
      ) : (
        <div className="divide-y divide-white/5">
          <InfoRow label="Data contactarii" value={fmtDate(o.data_contactarii)} />
          <InfoRow
            label="Stage"
            value={
              <span className="flex items-center justify-end gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stageColor }}
                />
                {o.stage}
              </span>
            }
          />
          <InfoRow
            label="Status"
            value={
              <span className="flex items-center justify-end gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                {o.status}
              </span>
            }
          />
          {o.status === "Pierduta" && <InfoRow label="Motiv pierdere" value={o.motiv_pierdere} />}
          {o.status === "Amanata" && (
            <>
              <InfoRow label="Motiv amanare" value={o.motiv_amanare} />
              <InfoRow label="Data revenire" value={fmtDate(o.data_revenire)} />
            </>
          )}
          <InfoRow label="Substatus" value={o.substatus} />
          <InfoRow label="Motivatia substatusului" value={o.motivatia_substatusului} />
          <InfoRow label="Probability" value={`${Math.round((o.probability ?? 0) * 100)}%`} />
        </div>
      )}
    </div>
  );
}
