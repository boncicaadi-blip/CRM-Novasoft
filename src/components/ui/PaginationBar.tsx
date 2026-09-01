"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  pageSize,
  setPageSize,
  page,
  setPage,
  totalPages,
  totalItems,
}: {
  pageSize: number | "toate";
  setPageSize: (size: number | "toate") => void;
  page: number;
  setPage: (updater: (p: number) => number) => void;
  totalPages: number;
  totalItems: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
      <div className="flex items-center gap-1.5">
        <span>Randuri pe pagina:</span>
        {[25, 50, 100, "toate" as const].map((size) => (
          <button
            key={size}
            onClick={() => {
              setPageSize(size);
              setPage(() => 1);
            }}
            className={`rounded-md px-2 py-1 font-medium transition ${
              pageSize === size
                ? "bg-[#E8007A] text-[#0B0D1A]"
                : "border border-border-subtle text-text-secondary hover:bg-surface-1"
            }`}
          >
            {size === "toate" ? "Toate" : size}
          </button>
        ))}
      </div>
      {pageSize !== "toate" && (
        <div className="flex items-center gap-2">
          <span>
            {totalItems === 0
              ? "0 rezultate"
              : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalItems)} din ${totalItems}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Pagina {page} din {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
