"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export type ChartSize = "sm" | "md" | "lg";

/** sm = o treime din latime, md = jumatate, lg = pe tot randul (grid de 6 coloane pe ecrane mari). */
const SIZE_CLASSES: Record<ChartSize, string> = {
  sm: "lg:col-span-2",
  md: "lg:col-span-3",
  lg: "lg:col-span-6",
};

const SIZE_LABELS: Record<ChartSize, string> = { sm: "S", md: "M", lg: "L" };

function nextSize(size: ChartSize): ChartSize {
  if (size === "sm") return "md";
  if (size === "md") return "lg";
  return "sm";
}

interface SortableChartCardProps {
  id: string;
  size: ChartSize;
  node: ReactNode;
  onCycleSize: () => void;
}

function SortableChartCard({ id, size, node, onCycleSize }: SortableChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`group/chartcard relative ${SIZE_CLASSES[size]}`}>
      <div className="absolute -top-2.5 right-2 z-10 flex gap-1 opacity-0 transition group-hover/chartcard:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Trage pentru a reordona"
          className="cursor-grab touch-none rounded-md border border-border-subtle bg-surface-2 p-1 text-text-secondary shadow-sm hover:text-text-primary active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </button>
        <button
          type="button"
          onClick={onCycleSize}
          title="Schimba dimensiunea (mic / mediu / mare)"
          className="rounded-md border border-border-subtle bg-surface-2 px-1.5 py-1 text-[10px] font-semibold text-text-secondary shadow-sm hover:text-text-primary"
        >
          {SIZE_LABELS[size]}
        </button>
      </div>
      {node}
    </div>
  );
}

export interface DashboardChartItem {
  /** Id unic si stabil - folosit pentru a retine ordinea/marimea in localStorage, nu se schimba intre randari. */
  id: string;
  defaultSize: ChartSize;
  node: ReactNode;
}

interface StoredLayout {
  order: string[];
  sizes: Record<string, ChartSize>;
}

/**
 * Grid de grafice cu reordonare prin tragere si redimensionare (S/M/L), ca
 * in Power BI. Layout-ul (ordine + marimi) se retine per-browser in
 * localStorage, per dashboard (prin `storageKey`) - nu necesita cont sau
 * migrare in baza de date, e o preferinta locala simpla.
 *
 * Butoanele de tragere/redimensionare apar doar la hover pe fiecare card,
 * ca sa nu aglomereze vizual dashboard-ul in mod normal.
 */
export function DashboardChartGrid({ storageKey, items }: { storageKey: string; items: DashboardChartItem[] }) {
  const defaultOrder = useMemo(() => items.map((i) => i.id), [items]);
  const defaultSizes = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i.defaultSize])) as Record<string, ChartSize>,
    [items]
  );

  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [sizes, setSizes] = useState<Record<string, ChartSize>>(defaultSizes);
  const [hydrated, setHydrated] = useState(false);

  // La montare, incarca layout-ul salvat (daca exista) - facut intentionat
  // dupa hidratare (nu prin initializare lazy in useState), ca sa evitam un
  // mismatch de hidratare: server-ul randeaza mereu ordinea implicita (nu
  // are acces la localStorage), deci si primul render din client trebuie sa
  // fie identic - abia apoi, in effect, aplicam ordinea salvata de user.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentionat, vezi comentariul de mai sus */
    try {
      const raw = window.localStorage.getItem(`nova-dashboard-layout:${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredLayout>;
        const validIds = new Set(defaultOrder);
        const savedOrder = (parsed.order ?? []).filter((id) => validIds.has(id));
        const missing = defaultOrder.filter((id) => !savedOrder.includes(id));
        setOrder([...savedOrder, ...missing]);
        setSizes((prev) => ({ ...prev, ...parsed.sizes }));
      }
    } catch {
      // localStorage indisponibil sau continut corupt - ramane pe layout-ul implicit.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(`nova-dashboard-layout:${storageKey}`, JSON.stringify({ order, sizes }));
    } catch {
      // spatiu localStorage plin/indisponibil - layout-ul ramane doar pentru sesiunea curenta.
    }
  }, [order, sizes, storageKey, hydrated]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const nodeById = useMemo(() => new Map(items.map((i) => [i.id, i.node])), [items]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {order.map((id) => {
            const node = nodeById.get(id);
            if (!node) return null;
            return (
              <SortableChartCard
                key={id}
                id={id}
                size={sizes[id] ?? defaultSizes[id] ?? "sm"}
                node={node}
                onCycleSize={() => setSizes((prev) => ({ ...prev, [id]: nextSize(prev[id] ?? defaultSizes[id] ?? "sm") }))}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
