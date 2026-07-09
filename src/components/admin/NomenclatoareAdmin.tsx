"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, EyeOff, Eye, GripVertical, AlertTriangle } from "lucide-react";
import { NOMENCLATOR_CATEGORII } from "@/lib/constants";
import {
  createNomenclatorAction,
  updateNomenclatorAction,
  toggleNomenclatorActivAction,
  deleteNomenclatorAction,
} from "@/lib/actions/nomenclatoare";
import type { Nomenclator } from "@/types/opportunity";

export function NomenclatoareAdmin({ items }: { items: Nomenclator[] }) {
  const [activeTab, setActiveTab] = useState(NOMENCLATOR_CATEGORII[0].value);

  const categorieInfo = NOMENCLATOR_CATEGORII.find((c) => c.value === activeTab)!;
  const categoryItems = items
    .filter((i) => i.categorie === activeTab)
    .sort((a, b) => a.ordine - b.ordine);

  const parentOptions = categorieInfo.parentCategorie
    ? items.filter((i) => i.categorie === categorieInfo.parentCategorie && i.activ).sort((a, b) => a.ordine - b.ordine)
    : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Tab-uri categorii: scroll orizontal pe mobil, lista verticala pe desktop */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {NOMENCLATOR_CATEGORII.map((cat) => {
          const count = items.filter((i) => i.categorie === cat.value && i.activ).length;
          const neincadrate = cat.parentCategorie
            ? items.filter((i) => i.categorie === cat.value && i.activ && !i.parent_id).length
            : 0;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition whitespace-nowrap lg:w-full lg:whitespace-normal ${
                activeTab === cat.value
                  ? "bg-surface-2 font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface-1"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {cat.label}
                {neincadrate > 0 && (
                  <span title={`${neincadrate} fara incadrare parinte`}>
                    <AlertTriangle size={11} className="text-amber-500" />
                  </span>
                )}
              </span>
              <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-text-secondary">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista valorilor pentru categoria selectata */}
      <div className="flex-1">
        {categorieInfo.parentCategorie && (
          <p className="mb-3 text-xs text-text-muted">
            Fiecare valoare de aici apartine unei categorii părinte ({" "}
            {NOMENCLATOR_CATEGORII.find((c) => c.value === categorieInfo.parentCategorie)?.label} ) - alege-o la
            adaugare/editare, ca formularul de Cheltuieli sa poata filtra corect. Valorile marcate cu{" "}
            <AlertTriangle size={11} className="inline text-amber-500" /> nu au inca o incadrare parinte setata.
          </p>
        )}
        <AddNomenclatorForm
          categorie={activeTab}
          hasColor={categorieInfo.hasColor}
          hasProbability={categorieInfo.hasProbability}
          parentOptions={parentOptions}
        />
        <div className="mt-4 space-y-1.5">
          {categoryItems.map((item) => (
            <NomenclatorRow
              key={item.id}
              item={item}
              hasColor={categorieInfo.hasColor}
              hasProbability={categorieInfo.hasProbability}
              parentOptions={parentOptions}
            />
          ))}
          {categoryItems.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              Nicio valoare in aceasta categorie inca.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ParentSelect({
  parentOptions,
  defaultValue,
}: {
  parentOptions: Nomenclator[];
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-text-muted">Incadrare parinte</label>
      <select
        name="parent_id"
        required
        defaultValue={defaultValue ?? ""}
        className="w-full sm:w-48 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
      >
        <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
          Selecteaza...
        </option>
        {parentOptions.map((p) => (
          <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
            {p.valoare}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddNomenclatorForm({
  categorie,
  hasColor,
  hasProbability,
  parentOptions,
}: {
  categorie: string;
  hasColor: boolean;
  hasProbability: boolean;
  parentOptions: Nomenclator[] | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createNomenclatorAction(formData);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm text-text-secondary transition hover:border-[#E8007A]/50 hover:text-[#E8007A]"
      >
        <Plus size={15} />
        Adauga valoare noua
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-surface-1 p-3"
    >
      <input type="hidden" name="categorie" value={categorie} />
      <div>
        <label className="mb-1 block text-[11px] text-text-muted">Valoare</label>
        <input
          name="valoare"
          required
          autoFocus
          className="w-full sm:w-48 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
      </div>
      {parentOptions && <ParentSelect parentOptions={parentOptions} />}
      {hasColor && (
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Culoare</label>
          <input
            type="color"
            name="culoare"
            defaultValue="var(--text-secondary)"
            className="h-[34px] w-12 rounded-md border border-border-subtle bg-surface-2"
          />
        </div>
      )}
      {hasProbability && (
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Probability (0-1)</label>
          <input
            type="number"
            name="probability"
            step="0.01"
            min={0}
            max={1}
            defaultValue={0.1}
            className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-[11px] text-text-muted">Ordine</label>
        <input
          type="number"
          name="ordine"
          defaultValue={0}
          className="w-16 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "..." : "Salveaza"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-1"
      >
        Anuleaza
      </button>
    </form>
  );
}

function NomenclatorRow({
  item,
  hasColor,
  hasProbability,
  parentOptions,
}: {
  item: Nomenclator;
  hasColor: boolean;
  hasProbability: boolean;
  parentOptions: Nomenclator[] | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await updateNomenclatorAction(item.id, formData);
      setEditing(false);
    });
  }

  function handleToggle() {
    startTransition(() => toggleNomenclatorActivAction(item.id, !item.activ));
  }

  function handleDelete() {
    startTransition(() => deleteNomenclatorAction(item.id));
  }

  const parentLabel = parentOptions?.find((p) => p.id === item.parent_id)?.valoare ?? null;

  if (editing) {
    return (
      <form
        action={handleUpdate}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[#E8007A]/30 bg-surface-1 p-3"
      >
        <input
          name="valoare"
          defaultValue={item.valoare}
          required
          className="w-full sm:w-48 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
        {parentOptions && <ParentSelect parentOptions={parentOptions} defaultValue={item.parent_id} />}
        {hasColor && (
          <input
            type="color"
            name="culoare"
            defaultValue={item.culoare ?? "var(--text-secondary)"}
            className="h-[34px] w-12 rounded-md border border-border-subtle bg-surface-2"
          />
        )}
        {hasProbability && (
          <input
            type="number"
            name="probability"
            step="0.01"
            min={0}
            max={1}
            defaultValue={item.probability ?? 0}
            className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        )}
        <input
          type="number"
          name="ordine"
          defaultValue={item.ordine}
          className="w-16 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
        >
          Salveaza
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-1"
        >
          Anuleaza
        </button>
      </form>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border-faint px-3 py-2 transition ${
        item.activ ? "bg-surface-1" : "bg-surface-1 opacity-50"
      }`}
    >
      <GripVertical size={14} className="shrink-0 text-text-faint" />
      {hasColor && item.culoare && (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: item.culoare }}
        />
      )}
      <button onClick={() => setEditing(true)} className="flex-1 text-left text-sm text-text-primary hover:text-[#E8007A]">
        {item.valoare}
      </button>
      {parentOptions && (
        parentLabel ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary">{parentLabel}</span>
        ) : (
          <span
            title="Fara incadrare parinte - editeaza si asigneaza una"
            className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-500"
          >
            <AlertTriangle size={11} />
            neincadrat
          </span>
        )
      )}
      {hasProbability && item.probability !== null && (
        <span className="text-xs text-text-muted">{Math.round(item.probability * 100)}%</span>
      )}
      <span className="text-xs text-text-faint">#{item.ordine}</span>
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={item.activ ? "Dezactiveaza" : "Activeaza"}
        className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
      >
        {item.activ ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      {confirmingDelete ? (
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md bg-red-500/20 px-2 py-1 text-red-400 hover:bg-red-500/30"
          >
            Sterge
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="rounded-md px-2 py-1 text-text-secondary hover:bg-surface-1"
          >
            Anuleaza
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          title="Sterge definitiv"
          className="rounded-md p-1.5 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
