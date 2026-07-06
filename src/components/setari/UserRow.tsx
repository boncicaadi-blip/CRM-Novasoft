"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, UserCheck } from "lucide-react";
import { updateUserAction, approveUserAction } from "@/lib/actions/users";
import { ALL_MODULES, MODULE_LABELS, SUBMODULES, submoduleFullKey, type ModuleKey } from "@/lib/modules";
import type { Profile } from "@/types/opportunity";

export function UserRow({ user }: { user: Profile }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<"admin" | "user">(user.role);
  const [moduleAccess, setModuleAccess] = useState<string[]>(user.module_access ?? ["crm"]);
  const [submoduleAccess, setSubmoduleAccess] = useState<string[]>(user.submodule_access ?? []);
  const [isPending, startTransition] = useTransition();
  const [isApproving, startApproving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleModule(m: ModuleKey) {
    setModuleAccess((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function toggleSubmodule(module: ModuleKey, submodule: string) {
    const fullKey = submoduleFullKey(module, submodule);
    setSubmoduleAccess((prev) =>
      prev.includes(fullKey) ? prev.filter((x) => x !== fullKey) : [...prev, fullKey]
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction(user.id, fullName, role, moduleAccess, submoduleAccess);
      if (result.success) {
        setEditing(false);
      } else {
        setError(result.message ?? "Eroare la salvare.");
      }
    });
  }

  function handleApprove() {
    startApproving(async () => {
      await approveUserAction(user.id);
    });
  }

  function handleCancel() {
    setFullName(user.full_name);
    setRole(user.role);
    setModuleAccess(user.module_access ?? ["crm"]);
    setSubmoduleAccess(user.submodule_access ?? []);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/[0.02]">
        <td className="px-3 py-2.5" colSpan={5}>
          <div className="flex flex-wrap items-start gap-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-40 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-[#E8007A]"
            />
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

            {role === "user" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500">Module:</span>
                {ALL_MODULES.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={moduleAccess.includes(m)}
                      onChange={() => toggleModule(m)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                    />
                    {MODULE_LABELS[m]}
                  </label>
                ))}
              </div>
            )}
            {role === "user" &&
              ALL_MODULES.map((m) => {
                const submodules = SUBMODULES[m];
                if (!submodules || moduleAccess.includes(m)) return null;
                return (
                  <div key={m} className="flex w-full flex-wrap items-center gap-2 pl-1">
                    <span className="text-[11px] text-slate-500">Sau doar, din {MODULE_LABELS[m]}:</span>
                    {submodules.map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400"
                      >
                        <input
                          type="checkbox"
                          checked={submoduleAccess.includes(submoduleFullKey(m, s.key))}
                          onChange={() => toggleSubmodule(m, s.key)}
                          className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                );
              })}
            {role === "admin" && (
              <span className="text-[11px] text-slate-500">
                Adminii au acces automat la toate modulele.
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
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
        {user.role === "user" && (
          <span className="ml-2 text-[11px] text-slate-500">
            {[
              ...(user.module_access ?? []).map((m) => MODULE_LABELS[m as ModuleKey] ?? m),
              ...(user.submodule_access ?? []).map((s) => {
                const [mod, sub] = s.split(".");
                const label = SUBMODULES[mod as ModuleKey]?.find((x) => x.key === sub)?.label ?? s;
                return `${MODULE_LABELS[mod as ModuleKey] ?? mod} → ${label}`;
              }),
            ].join(", ") || "fara module"}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {user.approved ? (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-400">
            Activ
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            In asteptare
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {!user.approved && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-1 text-xs font-medium text-green-400 transition hover:bg-green-500/25 disabled:opacity-50"
              title="Aproba acest cont"
            >
              <UserCheck size={12} />
              {isApproving ? "..." : "Aproba"}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-[#E8007A]"
            title="Editeaza"
          >
            <Pencil size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
