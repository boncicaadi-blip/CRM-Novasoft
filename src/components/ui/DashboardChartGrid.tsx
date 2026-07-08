"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
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

const SIZE_ORDER: ChartSize[] = ["sm", "md", "lg"];

/** sm = o treime din latime, md = jumatate, lg = pe tot randul. */
const SIZE_WIDTH_CLASSES: Record<ChartSize, string> = {
  sm: "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]",
  md: "w-full lg:w-[calc(50%-0.5rem)]",
  lg: "w-full",
};

const SIZE_PREVIEW_LABELS: Record<ChartSize, string> = { sm: "1/3", md: "1/2", lg: "intreg" };

/** Cati pixeli de tragere orizontala inseamna un "pas" de marime (sm -> md -> lg). */
const PX_PER_STEP = 110;

function clampIndex(i: number): number {
  return Math.min(SIZE_ORDER.length - 1, Math.max(0, i));
}

/**
 * Hook pentru redimensionare prin tragerea marginii din dreapta a cardului,
 * ca la redimensionarea unei ferestre. Fara librarii noi - doar pointer
 * events native. Cat timp utilizatorul trage, `previewSize` arata marimea
 * spre care s-ar indrepta daca ar da drumul acum (deja aplicata vizual, ca
 * sa se vada imediat efectul); la ridicarea degetului/mouse-ului, marimea
 * se retine definitiv prin `onCommit`.
 */
function useEdgeResize(onCommit: (size: ChartSize) => void) {
  const [dragState, setDragState] = useState<{ startX: number; startIndex: number; offset: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent, currentSize: ChartSize) {
    e.preventDefault();
    e.stopPropagation();
    const startIndex = SIZE_ORDER.indexOf(currentSize);
    setDragState({ startX: e.clientX, startIndex, offset: 0 });

    function onMove(ev: PointerEvent) {
      setDragState((prev) => (prev ? { ...prev, offset: ev.clientX - prev.startX } : prev));
    }
    function onUp(ev: PointerEvent) {
      setDragState((prev) => {
        if (prev) {
          const steps = Math.round((ev.clientX - prev.startX) / PX_PER_STEP);
          onCommit(SIZE_ORDER[clampIndex(prev.startIndex + steps)]);
        }
        return null;
      });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const previewSize =
    dragState === null ? null : SIZE_ORDER[clampIndex(dragState.startIndex + Math.round(dragState.offset / PX_PER_STEP))];

  return { onPointerDown, previewSize, isDragging: dragState !== null };
}

interface SortableChartCardProps {
  id: string;
  size: ChartSize;
  node: ReactNode;
  onResize: (size: ChartSize) => void;
}

function SortableChartCard({ id, size, node, onResize }: SortableChartCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { onPointerDown, previewSize, isDragging: isResizing } = useEdgeResize(onResize);
  const displaySize = previewSize ?? size;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/chartcard relative shrink-0 transition-[width] duration-200 ease-out ${SIZE_WIDTH_CLASSES[displaySize]}`}
    >
      {/* Maner de mutat - colt stanga-sus, la distanta de butonul de marire (dreapta-sus). */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Trage pentru a reordona"
        className="absolute -left-2 -top-2 z-10 cursor-grab touch-none rounded-md border border-border-subtle bg-surface-2 p-1 text-text-secondary opacity-0 shadow-sm transition hover:text-text-primary active:cursor-grabbing group-hover/chartcard:opacity-100"
      >
        <GripVertical size={13} />
      </button>

      {/* Maner de redimensionare - bara verticala pe marginea din dreapta, la mijloc. */}
      <div
        onPointerDown={(e) => onPointerDown(e, size)}
        title="Trage stanga/dreapta pentru a redimensiona"
        className={`absolute -right-2 top-1/2 z-10 flex h-12 w-4 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full opacity-0 transition group-hover/chartcard:opacity-100 ${
          isResizing ? "opacity-100" : ""
        }`}
      >
        <div className={`h-full w-1.5 rounded-full transition-colors ${isResizing ? "bg-[#E8007A]" : "bg-border-strong"}`} />
      </div>

      {isResizing && (
        <div className="pointer-events-none absolute -right-2 top-1/2 z-20 -translate-y-1/2 translate-x-full whitespace-nowrap rounded-md bg-[#E8007A] px-2 py-1 text-[10px] font-medium text-white shadow-lg">
          {SIZE_PREVIEW_LABELS[displaySize]}
        </div>
      )}

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
 * Grid de grafice cu reordonare prin tragere (maner stanga-sus) si
 * redimensionare prin tragerea marginii din dreapta (ca la o fereastra),
 * cu tranzitii line - fara sarituri. Layout-ul (ordine + marimi) se retine
 * per-browser in localStorage, per dashboard (prin `storageKey`) - nu
 * necesita cont sau migrare in baza de date, e o preferinta locala simpla.
 *
 * Manerele apar doar la hover pe fiecare card, ca sa nu aglomereze vizual
 * dashboard-ul in mod normal.
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentionat: server-ul randeaza mereu ordinea
       implicita (nu are acces la localStorage), deci primul render din client trebuie sa fie identic -
       abia aici, dupa hidratare, aplicam layout-ul salvat de user, ca sa evitam un mismatch. */
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
        <div ref={containerRef} className="flex flex-wrap gap-4">
          {order.map((id) => {
            const node = nodeById.get(id);
            if (!node) return null;
            return (
              <SortableChartCard
                key={id}
                id={id}
                size={sizes[id] ?? defaultSizes[id] ?? "sm"}
                node={node}
                onResize={(newSize) => setSizes((prev) => ({ ...prev, [id]: newSize }))}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
