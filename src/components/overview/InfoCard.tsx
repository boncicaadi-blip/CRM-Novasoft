export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-right text-sm text-text-primary">{value ?? "—"}</span>
    </div>
  );
}

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{title}</p>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

export function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-text-muted">{label}</span>
      {children}
    </label>
  );
}
