import { ReactNode } from "react";
import Link from "next/link";

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  accent?: string;
  /** Daca e dat, cardul devine clickable si duce la lista detaliata (drill-down). */
  href?: string;
}) {
  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        {icon && (
          <span style={{ color: accent ?? "#E8007A" }} className="opacity-70">
            {icon}
          </span>
        )}
      </div>
      <p className="font-mono text-2xl font-medium text-white">{value}</p>
      {sublabel && <p className="mt-1 text-[11px] text-slate-500">{sublabel}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">{content}</div>;
}
