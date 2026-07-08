import Link from "next/link";
import { Clock, AlertCircle } from "lucide-react";

export function ActionsList({
  actions,
}: {
  actions: { id: string; nume: string; actiune: string | null; data: string; isOverdue: boolean }[];
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">Actiuni planificate</p>
      {actions.length === 0 ? (
        <p className="py-6 text-center text-xs text-text-muted">Nicio actiune planificata.</p>
      ) : (
        <div className="space-y-1.5">
          {actions.map((a) => (
            <Link
              key={a.id}
              href={`/oportunitati/${a.id}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition hover:bg-surface-1"
            >
              <div className="flex items-center gap-2">
                {a.isOverdue ? (
                  <AlertCircle size={14} className="text-red-400" />
                ) : (
                  <Clock size={14} className="text-text-muted" />
                )}
                <div>
                  <p className="text-sm text-text-primary">{a.nume}</p>
                  <p className="text-[11px] text-text-muted">{a.actiune ?? "Actiune"}</p>
                </div>
              </div>
              <span
                className={`text-xs ${a.isOverdue ? "text-red-400" : "text-text-muted"}`}
              >
                {new Date(a.data).toLocaleDateString("ro-RO")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
