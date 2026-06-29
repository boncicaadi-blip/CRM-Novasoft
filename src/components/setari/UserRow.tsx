"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { updateUserAction } from "@/lib/actions/users";
import type { Profile } from "@/types/opportunity";

export function UserRow({ user }: { user: Profile }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction(user.id, fullName, role);
      if (result.success) {
        setEditing(false);
      } else {
        setError(result.message ?? "Eroare la salvare.");
      }
    });
  }

  function handleCancel() {
    setFullName(user.full_name);
    setRole(user.role);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/[0.02]">
        <td className="px-3 py-2.5">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-[#E8007A]"
          />
        </td>
        <td className="px-3 py-2.5 text-slate-400">{user.email}</td>
        <td className="px-3 py-2.5">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "user")}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-[#E8007A]"
          >
            <option value="user" style={{ backgroundColor: "#111535" }}>
              Utilizator
            </option>
            <option value="admin" style={{ backgroundColor: "#111535" }}>
              Administrator
            </option>
          </select>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md bg-[#E8007A] px-2 py-1 text-xs font-medium text-[#0B0D1A] disabled:opacity-50"
            >
              <Check size={12} />
              {isPending ? "..." : "Salveaza"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-md p-1 text-slate-400 hover:bg-white/5"
            >
              <X size={14} />
            </button>
          </div>
          {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/5">
      <td className="px-3 py-2.5 text-white">{user.full_name}</td>
      <td className="px-3 py-2.5 text-slate-400">{user.email}</td>
      <td className="px-3 py-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            user.role === "admin" ? "bg-[#E8007A]/20 text-[#E8007A]" : "bg-white/10 text-slate-300"
          }`}
        >
          {user.role === "admin" ? "Administrator" : "Utilizator"}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-[#E8007A]"
          title="Editeaza"
        >
          <Pencil size={14} />
        </button>
      </td>
    </tr>
  );
}
