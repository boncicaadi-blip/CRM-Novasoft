"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import {
  creazaInregistrareRegistruAction,
  actualizeazaInregistrareRegistruAction,
  toggleEtapaStatusAction,
  stergeInregistrareRegistruAction,
  type RegistruContractPayload,
} from "@/lib/actions/registru-contracte";
import { ETAPE_STATUS } from "@/types/registru-contracte";
import type { RegistruContract, TipPartenerRegistru } from "@/types/registru-contracte";
import type { Nomenclator } from "@/types/opportunity";

const ETAPE_SCURT: Record<string, string> = {
  status_draft: "D",
  status_trimis: "T",
  status_in_sistem: "IS",
  status_generat_grafic: "GG",
  status_semnat: "S",
  status_primit: "P",
  status_atasat: "A",
};

export function RegistruContracteClient({
  inregistrari,
  parteneri,
  produseServicii,
  tipuriServiciu,
  urmatorNrClient,
  urmatorNrFurnizor,
}: {
  inregistrari: RegistruContract[];
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
  produseServicii: Nomenclator[];
  tipuriServiciu: Nomenclator[];
  urmatorNrClient: number;
  urmatorNrFurnizor: number;
}) {
  const [filtru, setFiltru] = useState<TipPartenerRegistru>("client");
  const [showForm, setShowForm] = useState(false);
  const [editand, setEditand] = useState<RegistruContract | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [fNr, setFNr] = useState("");
  const [fDataDe, setFDataDe] = useState("");
  const [fDataPana, setFDataPana] = useState("");
  const [fClient, setFClient] = useState("");
  const [fProdus, setFProdus] = useState("");
  const [fServiciu, setFServiciu] = useState("");
  const [fEtapa, setFEtapa] = useState("");

  const numeAfisat = (r: RegistruContract) => {
    const partener = parteneri.find((p) => p.id === r.partner_id);
    return partener?.nume ?? r.partener_nume_liber ?? "—";
  };
  const numeNomenclator = (id: string | null, lista: Nomenclator[]) => lista.find((n) => n.id === id)?.valoare ?? "—";

  const listaFiltrata = useMemo(() => {
    return inregistrari.filter((r) => {
      if (r.tip_partener !== filtru) return false;
      if (fNr && !String(r.nr_contract).includes(fNr.trim())) return false;
      if (fDataDe && (!r.data_contract || r.data_contract < fDataDe)) return false;
      if (fDataPana && (!r.data_contract || r.data_contract > fDataPana)) return false;
      if (fClient && !numeAfisat(r).toLowerCase().includes(fClient.trim().toLowerCase())) return false;
      if (fProdus && r.produs_serviciu_id !== fProdus) return false;
      if (fServiciu && r.serviciu_id !== fServiciu) return false;
      if (fEtapa && !Boolean(r[fEtapa as keyof RegistruContract])) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inregistrari, filtru, fNr, fDataDe, fDataPana, fClient, fProdus, fServiciu, fEtapa, parteneri]);

  function resetFiltre() {
    setFNr("");
    setFDataDe("");
    setFDataPana("");
    setFClient("");
    setFProdus("");
    setFServiciu("");
    setFEtapa("");
  }

  function handleToggleEtapa(id: string, etapa: string, valoareCurenta: boolean) {
    startTransition(async () => {
      const result = await toggleEtapaStatusAction(id, etapa, !valoareCurenta);
      if (!result.success) setMessage(result.message ?? "Eroare.");
    });
  }

  function handleDelete(id: string, nr: number) {
    if (!confirm(`Stergi inregistrarea nr. ${nr} din registru?`)) return;
    startTransition(async () => {
      const result = await stergeInregistrareRegistruAction(id);
      setMessage(result.message ?? (result.success ? "Sters." : "Eroare."));
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Registru contracte</h1>
          <p className="text-xs text-text-secondary">
            Numerotare automată — următorul disponibil: {filtru === "client" ? urmatorNrClient : urmatorNrFurnizor}.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
        >
          <Plus size={14} />
          Înregistrare nouă
        </button>
      </div>

      {message && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300">
          {message}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setFiltru("client")}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            filtru === "client" ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"
          }`}
        >
          Clienți ({inregistrari.filter((r) => r.tip_partener === "client").length})
        </button>
        <button
          onClick={() => setFiltru("furnizor")}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            filtru === "furnizor" ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"
          }`}
        >
          Furnizori ({inregistrari.filter((r) => r.tip_partener === "furnizor").length})
        </button>
      </div>

      {/* Filtre */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface-1 p-3 sm:grid-cols-4 lg:grid-cols-7">
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Nr.</label>
          <input
            value={fNr}
            onChange={(e) => setFNr(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Data de la</label>
          <input
            type="date"
            value={fDataDe}
            onChange={(e) => setFDataDe(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Data până la</label>
          <input
            type="date"
            value={fDataPana}
            onChange={(e) => setFDataPana(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">{filtru === "client" ? "Client" : "Furnizor"}</label>
          <input
            value={fClient}
            onChange={(e) => setFClient(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Produs</label>
          <select
            value={fProdus}
            onChange={(e) => setFProdus(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          >
            <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
              Toate
            </option>
            {produseServicii.map((p) => (
              <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                {p.valoare}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Serviciu</label>
          <select
            value={fServiciu}
            onChange={(e) => setFServiciu(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          >
            <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
              Toate
            </option>
            {tipuriServiciu.map((t) => (
              <option key={t.id} value={t.id} style={{ backgroundColor: "var(--surface-1)" }}>
                {t.valoare}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-secondary">Etapă</label>
          <select
            value={fEtapa}
            onChange={(e) => setFEtapa(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
          >
            <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
              Toate
            </option>
            {ETAPE_STATUS.map((e) => (
              <option key={e.key} value={e.key} style={{ backgroundColor: "var(--surface-1)" }}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex items-end sm:col-span-4 lg:col-span-7">
          <button onClick={resetFiltre} className="flex items-center gap-1 text-xs text-text-secondary hover:text-[#E8007A]">
            <X size={12} />
            Șterge filtrele ({listaFiltrata.length} din {inregistrari.filter((r) => r.tip_partener === filtru).length})
          </button>
        </div>
      </div>

      {/* Legenda etapelor */}
      <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface-1 px-3 py-1.5 text-[11px] text-text-secondary">
        <span className="font-medium text-text-primary">Etape:</span>
        {ETAPE_STATUS.map((e) => (
          <span key={e.key} className="flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border-subtle text-[8px] font-bold">
              {ETAPE_SCURT[e.key]}
            </span>
            {e.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
              <th className="px-3 py-2 text-right">Nr.</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">{filtru === "client" ? "Client" : "Furnizor"}</th>
              <th className="px-3 py-2">Produs</th>
              <th className="px-3 py-2">Serviciu</th>
              <th className="px-3 py-2">Etape</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {listaFiltrata.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-text-secondary">
                  Nicio înregistrare găsită.
                </td>
              </tr>
            )}
            {listaFiltrata.map((r) => (
              <tr key={r.id} className="border-b border-border-faint hover:bg-surface-1">
                <td className="px-3 py-2 text-right font-mono text-text-primary">{r.nr_contract}</td>
                <td className="px-3 py-2 text-text-secondary">{r.data_contract ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-text-primary">{numeAfisat(r)}</td>
                <td className="px-3 py-2 text-text-secondary">{numeNomenclator(r.produs_serviciu_id, produseServicii)}</td>
                <td className="px-3 py-2 text-text-secondary">{numeNomenclator(r.serviciu_id, tipuriServiciu)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {ETAPE_STATUS.filter((e) => filtru === "client" || e.key !== "status_generat_grafic").map((e) => {
                      const activ = Boolean(r[e.key]);
                      return (
                        <button
                          key={e.key}
                          onClick={() => handleToggleEtapa(r.id, e.key, activ)}
                          disabled={isPending}
                          title={e.label}
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-bold transition disabled:opacity-50 ${
                            activ
                              ? "border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]"
                              : "border-border-subtle text-text-faint hover:border-text-secondary"
                          }`}
                        >
                          {ETAPE_SCURT[e.key]}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setEditand(r)}
                    className="mr-1 rounded-md p-1 text-text-secondary hover:bg-[#E8007A]/15 hover:text-[#E8007A]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.nr_contract)}
                    className="rounded-md p-1 text-text-secondary hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InregistrareModal
          tipImplicit={filtru}
          parteneri={parteneri}
          produseServicii={produseServicii}
          tipuriServiciu={tipuriServiciu}
          onClose={() => setShowForm(false)}
          onSaved={(msg) => {
            setMessage(msg);
            setShowForm(false);
          }}
        />
      )}

      {editand && (
        <InregistrareModal
          tipImplicit={editand.tip_partener}
          inregistrare={editand}
          parteneri={parteneri}
          produseServicii={produseServicii}
          tipuriServiciu={tipuriServiciu}
          onClose={() => setEditand(null)}
          onSaved={(msg) => {
            setMessage(msg);
            setEditand(null);
          }}
        />
      )}
    </div>
  );
}

function InregistrareModal({
  tipImplicit,
  inregistrare,
  parteneri,
  produseServicii,
  tipuriServiciu,
  onClose,
  onSaved,
}: {
  tipImplicit: TipPartenerRegistru;
  inregistrare?: RegistruContract;
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
  produseServicii: Nomenclator[];
  tipuriServiciu: Nomenclator[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [tipPartener, setTipPartener] = useState<TipPartenerRegistru>(inregistrare?.tip_partener ?? tipImplicit);
  const [nrContract, setNrContract] = useState(inregistrare ? String(inregistrare.nr_contract) : "");
  const [partnerId, setPartnerId] = useState(inregistrare?.partner_id ?? "");
  const [numeLiber, setNumeLiber] = useState(inregistrare?.partener_nume_liber ?? "");
  const [tipDocument, setTipDocument] = useState(inregistrare?.tip_document ?? "Contract");
  const [dataContract, setDataContract] = useState(inregistrare?.data_contract ?? "");
  const [produsId, setProdusId] = useState(inregistrare?.produs_serviciu_id ?? "");
  const [serviciuId, setServiciuId] = useState(inregistrare?.serviciu_id ?? "");
  const [detaliiServiciu, setDetaliiServiciu] = useState(inregistrare?.detalii_serviciu ?? "");
  const [contactNume, setContactNume] = useState(inregistrare?.contact_nume ?? "");
  const [contactEmail, setContactEmail] = useState(inregistrare?.contact_email ?? "");
  const [contactTelefon, setContactTelefon] = useState(inregistrare?.contact_telefon ?? "");

  function handleSubmit() {
    const payload: RegistruContractPayload = {
      tip_partener: tipPartener,
      tip_document: tipDocument || null,
      data_contract: dataContract || null,
      partner_id: partnerId || null,
      partener_nume_liber: partnerId ? null : numeLiber || null,
      produs_serviciu_id: produsId || null,
      serviciu_id: serviciuId || null,
      detalii_serviciu: detaliiServiciu || null,
      contact_nume: contactNume || null,
      contact_email: contactEmail || null,
      contact_telefon: contactTelefon || null,
      contact2_nume: inregistrare?.contact2_nume ?? null,
      contact2_email: inregistrare?.contact2_email ?? null,
      contact2_telefon: inregistrare?.contact2_telefon ?? null,
    };
    startTransition(async () => {
      const result = inregistrare
        ? await actualizeazaInregistrareRegistruAction(inregistrare.id, { ...payload, nr_contract: Number(nrContract) })
        : await creazaInregistrareRegistruAction(payload);
      onSaved(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">
          {inregistrare ? `Editează înregistrarea nr. ${inregistrare.nr_contract}` : "Înregistrare nouă în registru"}
        </h2>
        <div className="max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tip</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipPartener("client")}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${tipPartener === "client" ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"}`}
              >
                Client
              </button>
              <button
                onClick={() => setTipPartener("furnizor")}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${tipPartener === "furnizor" ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]" : "border-border-subtle text-text-secondary"}`}
              >
                Furnizor
              </button>
            </div>
          </div>
          {inregistrare && (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Numărul de contract</label>
              <input
                type="number"
                value={nrContract}
                onChange={(e) => setNrContract(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Partener (din CRM)</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Alege sau scrie mai jos —
              </option>
              {parteneri.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.nume}
                </option>
              ))}
            </select>
          </div>
          {!partnerId && (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Sau nume liber (dacă nu e încă în CRM)</label>
              <input
                value={numeLiber}
                onChange={(e) => setNumeLiber(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Tip document</label>
              <input
                value={tipDocument}
                onChange={(e) => setTipDocument(e.target.value)}
                placeholder="Contract, Anexă..."
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Data</label>
              <input
                type="date"
                value={dataContract}
                onChange={(e) => setDataContract(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          </div>
          {tipPartener === "client" && (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Produs</label>
              <select
                value={produsId}
                onChange={(e) => setProdusId(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              >
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  — Fără —
                </option>
                {produseServicii.map((p) => (
                  <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                    {p.valoare}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Serviciu contractat</label>
            <select
              value={serviciuId}
              onChange={(e) => setServiciuId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Fără —
              </option>
              {tipuriServiciu.map((t) => (
                <option key={t.id} value={t.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {t.valoare}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Detalii serviciu (opțional)</label>
            <input
              value={detaliiServiciu}
              onChange={(e) => setDetaliiServiciu(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Contact</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={contactNume}
              onChange={(e) => setContactNume(e.target.value)}
              placeholder="Nume"
              className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email"
              className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
            <input
              value={contactTelefon}
              onChange={(e) => setContactTelefon(e.target.value)}
              placeholder="Telefon"
              className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>

          {inregistrare && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Etape</p>
              <p className="text-[11px] text-text-secondary">
                Etapele se bifează direct din tabel (nu de aici) — click pe litera corespunzătoare, lângă fiecare
                înregistrare.
              </p>
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || (!partnerId && !numeLiber.trim()) || (!!inregistrare && !nrContract)}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            {isPending ? "Se salvează..." : "Salvează"}
          </button>
        </div>
      </div>
    </div>
  );
}
