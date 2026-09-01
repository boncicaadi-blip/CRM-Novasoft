"use client";

import { MesajActiune } from "./MesajActiune";
import { useState, useTransition } from "react";
import { Plus, Pencil } from "lucide-react";
import { createAngajatAction, updateAngajatAction } from "@/lib/actions/concedii";
import type { Angajat } from "@/types/concedii";
import type { Profile } from "@/types/opportunity";

export function AngajatiRegistruClient({ angajati, profiles }: { angajati: Angajat[]; profiles: Profile[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Angajat | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtruActivi, setFiltruActivi] = useState(true);

  const listaFiltrata = angajati.filter((a) => !filtruActivi || a.activ);
  const angajatiPosibiliManager = angajati.filter((a) => a.activ);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Registru angajati</h1>
          <p className="text-xs text-text-secondary">
            {angajati.filter((a) => a.activ).length} activi din {angajati.length} total (istoric pastrat pentru cei inactivi)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
        >
          <Plus size={14} />
          Angajat nou
        </button>
      </div>

      <MesajActiune message={message} />

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setFiltruActivi(true)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            filtruActivi ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"
          }`}
        >
          Doar activi
        </button>
        <button
          onClick={() => setFiltruActivi(false)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            !filtruActivi ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"
          }`}
        >
          Toti (inclusiv istoric)
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
              <th className="px-3 py-2">Nr.</th>
              <th className="px-3 py-2">Nume</th>
              <th className="px-3 py-2">Functie</th>
              <th className="px-3 py-2">Departament</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2 text-right">Zile/an</th>
              <th className="px-3 py-2">Cont utilizator</th>
              <th className="px-3 py-2">Angajat din</th>
              <th className="px-3 py-2">Incetat la</th>
              <th className="px-3 py-2">Stare</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrata.map((a, idx) => {
              const manager = angajati.find((m) => m.id === a.manager_id);
              const cont = profiles.find((p) => p.id === a.user_id);
              return (
                <tr key={a.id} className={`border-b border-border-faint hover:bg-surface-1 ${!a.activ ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2 text-text-secondary">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{a.nume}</td>
                  <td className="px-3 py-2 text-text-secondary">{a.functie ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{a.departament ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{manager?.nume ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">{a.zile_alocate_an}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {cont ? cont.full_name || cont.email : <span className="text-amber-400">Neasociat</span>}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{a.data_angajare ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{a.data_incetare ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        a.activ ? "bg-green-500/15 text-green-400" : "bg-surface-2 text-text-secondary"
                      }`}
                    >
                      {a.activ ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setEditing(a)}
                      className="rounded-md p-1 text-text-muted hover:bg-surface-2 hover:text-[#E8007A]"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <AngajatModal
          angajat={editing}
          angajatiPosibiliManager={angajatiPosibiliManager}
          profiles={profiles}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={(msg) => {
            setMessage(msg);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AngajatModal({
  angajat,
  angajatiPosibiliManager,
  profiles,
  onClose,
  onSaved,
}: {
  angajat: Angajat | null;
  angajatiPosibiliManager: Angajat[];
  profiles: Profile[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nume, setNume] = useState(angajat?.nume ?? "");
  const [functie, setFunctie] = useState(angajat?.functie ?? "");
  const [departament, setDepartament] = useState(angajat?.departament ?? "");
  const [dataAngajare, setDataAngajare] = useState(angajat?.data_angajare ?? "");
  const [dataIncetare, setDataIncetare] = useState(angajat?.data_incetare ?? "");
  const [activ, setActiv] = useState(angajat?.activ ?? true);
  const [managerId, setManagerId] = useState(angajat?.manager_id ?? "");
  const [userId, setUserId] = useState(angajat?.user_id ?? "");
  const [zileAlocateAn, setZileAlocateAn] = useState(String(angajat?.zile_alocate_an ?? 21));

  function handleSubmit() {
    if (!nume.trim()) return;
    const zileAlocateNum = Number(zileAlocateAn) || 21;
    startTransition(async () => {
      const result = angajat
        ? await updateAngajatAction(angajat.id, {
            nume,
            functie: functie || null,
            departament: departament || null,
            data_angajare: dataAngajare || null,
            data_incetare: dataIncetare || null,
            activ,
            manager_id: managerId || null,
            user_id: userId || null,
            zile_alocate_an: zileAlocateNum,
          })
        : await createAngajatAction({
            nume,
            functie: functie || null,
            departament: departament || null,
            data_angajare: dataAngajare || null,
            manager_id: managerId || null,
            user_id: userId || null,
            zile_alocate_an: zileAlocateNum,
          });
      onSaved(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">{angajat ? "Editeaza angajat" : "Angajat nou"}</h2>
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Nume</label>
            <input
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Functie</label>
              <input
                value={functie}
                onChange={(e) => setFunctie(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Departament</label>
              <input
                value={departament}
                onChange={(e) => setDepartament(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Cont utilizator (pentru drepturi in CRM)</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Fara cont asociat —
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.full_name || p.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Manager (aproba cererile)</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Fara manager —
              </option>
              {angajatiPosibiliManager
                .filter((m) => m.id !== angajat?.id)
                .map((m) => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: "var(--surface-1)" }}>
                    {m.nume}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">
              Zile de concediu alocate/an (ex. 21)
            </label>
            <input
              type="number"
              value={zileAlocateAn}
              onChange={(e) => setZileAlocateAn(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Angajat din</label>
              <input
                type="date"
                value={dataAngajare}
                onChange={(e) => setDataAngajare(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
            {angajat && (
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Incetat la</label>
                <input
                  type="date"
                  value={dataIncetare}
                  onChange={(e) => setDataIncetare(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
                />
              </div>
            )}
          </div>
          {angajat && (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={activ} onChange={(e) => setActiv(e.target.checked)} />
              Activ (debifeaza la incetarea contractului, pastreaza istoricul)
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Anuleaza
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !nume.trim()}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            Salveaza
          </button>
        </div>
      </div>
    </div>
  );
}
