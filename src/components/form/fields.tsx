"use client";

import { ReactNode, useRef } from "react";
import { MicButton } from "@/components/ui/MicButton";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-[#E8007A] placeholder:text-slate-600";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

/** Input numeric cu simbol EUR fix in dreapta - pentru toate campurile monetare. */
export function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        {...props}
        className={`${inputClass} pr-10 ${props.className ?? ""}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
        EUR
      </span>
    </div>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="relative">
      <textarea
        ref={ref}
        {...props}
        className={`${inputClass} min-h-[80px] resize-y pr-9 ${props.className ?? ""}`}
      />
      <div className="absolute right-1.5 top-1.5">
        <MicButton targetRef={ref} />
      </div>
    </div>
  );
}

// Stilurile native ale <option> ignora clasele Tailwind ale parintelui <select>
// (browserul le randeaza cu paleta sistemului de operare), asa ca fortam
// culorile explicit prin style inline - altfel optiunile apar alb-pe-alb
// pe dark theme.
const optionStyle = { backgroundColor: "#111535", color: "#F1F5F9" };

export function Select({
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      <option value="" style={optionStyle}>
        {placeholder ?? "Selecteaza..."}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt} style={optionStyle}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#E8007A]"
      />
      {label}
    </label>
  );
}
