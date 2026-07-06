"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatEur } from "@/lib/format";
import { normalizeJudetName } from "@/lib/geo";
import { groupByJudetVenituri } from "@/lib/venituri-dashboard-analytics";
import { useTableSort } from "@/lib/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { RomaniaMap } from "@/components/dashboard/map/RomaniaMap";
import type { VenitLinie } from "@/types/venituri";
import type { PartnerGrupInfo } from "@/lib/data/venituri";
import type { FeatureCollection, Geometry } from "geojson";

interface ClientRand {
  partnerId: string;
  nume: string;
  grup: string;
  judet: string;
  realizat: number;
  estimat: number;
}

export function VenituriMapClient({
  geoData,
  venituriLinii,
  partnersGrup,
}: {
  geoData: FeatureCollection<Geometry, { name: string }>;
  venituriLinii: VenitLinie[];
  partnersGrup: PartnerGrupInfo[];
}) {
  const [metric, setMetric] = useState<"count" | "arr">("arr");
  const [selectedJudete, setSelectedJudete] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const partnerInfoById = useMemo(
    () => new Map(partnersGrup.map((p) => [p.id, p])),
    [partnersGrup]
  );

  const filteredLinii = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return venituriLinii;
    return venituriLinii.filter((l) => l.nume_client.toLowerCase().includes(q));
  }, [venituriLinii, search]);

  const judetData = useMemo(() => {
    const lookup = new Map(partnersGrup.map((p) => [p.id, p.judet]));
    return groupByJudetVenituri(filteredLinii, lookup);
  }, [filteredLinii, partnersGrup]);

  const sortedJudete = [...judetData].sort((a, b) => (metric === "count" ? b.count - a.count : b.arr - a.arr));

  const selectedNormalized = useMemo(
    () => new Set(selectedJudete.map(normalizeJudetName)),
    [selectedJudete]
  );

  // Toti clientii (Grup + Client + Judet + Venit) - randul complet, pentru
  // tabelul de dedesubt. Filtrat de judetele selectate, cand exista o
  // selectie pe harta.
  const toateClienti = useMemo(() => {
    const map = new Map<string, ClientRand>();
    for (const l of filteredLinii) {
      const info = l.partner_id ? partnerInfoById.get(l.partner_id) : undefined;
      const judet = info?.judet ?? "Necunoscut";
      if (selectedJudete.length > 0 && !selectedNormalized.has(normalizeJudetName(judet))) continue;

      const key = l.partner_id ?? l.nume_client;
      const cur = map.get(key) ?? {
        partnerId: key,
        nume: l.nume_client,
        grup: info?.nume_grup ?? "—",
        judet,
        realizat: 0,
        estimat: 0,
      };
      cur.realizat += l.venit_realizat ?? 0;
      cur.estimat += l.venit_estimat;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [filteredLinii, partnerInfoById, selectedNormalized, selectedJudete]);

  const defaultOrdered = useMemo(() => [...toateClienti].sort((a, b) => b.realizat - a.realizat), [toateClienti]);
  const { sorted: clientiSortati, sortKey, sortDir, requestSort } = useTableSort(defaultOrdered, (c, key) => {
    switch (key) {
      case "grup":
        return c.grup;
      case "client":
        return c.nume;
      case "judet":
        return c.judet;
      case "realizat":
        return c.realizat;
      case "estimat":
        return c.estimat;
      default:
        return null;
    }
  });

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Distributie clienti pe harta</h1>
          <p className="text-sm text-slate-500">Venituri, distribuite geografic pe judete, Romania</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cauta client..."
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
          />
          <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
            <button
              onClick={() => setMetric("count")}
              className={`rounded-md px-3 py-1.5 transition ${metric === "count" ? "bg-white/10 text-white" : "text-slate-500"}`}
            >
              Nr. linii
            </button>
            <button
              onClick={() => setMetric("arr")}
              className={`rounded-md px-3 py-1.5 transition ${metric === "arr" ? "bg-white/10 text-white" : "text-slate-500"}`}
            >
              Venit realizat
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <RomaniaMap
            geoData={geoData}
            data={judetData}
            metric={metric}
            selectedJudete={selectedJudete}
            onSelectionChange={setSelectedJudete}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-sm font-medium text-white">Top judete</p>
          <div className="space-y-2">
            {sortedJudete.slice(0, 12).map((d) => (
              <button
                key={d.judet}
                onClick={() => setSelectedJudete([d.judet])}
                className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-sm transition hover:bg-white/5"
              >
                <span className="text-slate-300">{d.judet}</span>
                <span className="font-mono text-xs text-slate-400">
                  {metric === "count" ? `${d.count} linii` : formatEur(d.arr)}
                </span>
              </button>
            ))}
            {sortedJudete.length === 0 && <p className="text-xs text-slate-500">Niciun venit cu judet completat.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-white">
            {selectedJudete.length > 0 ? `Clienti in: ${selectedJudete.join(", ")}` : "Toti clientii"}
            <span className="ml-2 text-xs text-slate-500">({clientiSortati.length})</span>
          </p>
          {selectedJudete.length > 0 && (
            <button
              onClick={() => setSelectedJudete([])}
              className="flex items-center gap-1 rounded-md p-1 text-xs text-slate-500 transition hover:bg-white/5 hover:text-white"
              title="Sterge selectia de judete"
            >
              <X size={13} />
              Sterge filtrul de judet
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[10px] uppercase text-slate-500">
                <SortableTh label="Grup" sortKey="grup" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={200} />
                <SortableTh label="Client" sortKey="client" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={260} />
                <SortableTh label="Judet" sortKey="judet" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={120} />
                <SortableTh label="Venit ARR (realizat)" sortKey="realizat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" />
                <SortableTh label="Venit estimat" sortKey="estimat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {clientiSortati.map((c) => (
                <tr key={c.partnerId} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="truncate px-3 py-2 text-slate-400">{c.grup}</td>
                  <td className="truncate px-3 py-2 text-white">{c.nume}</td>
                  <td className="px-3 py-2 text-slate-400">{c.judet}</td>
                  <td className="px-3 py-2 text-right font-mono text-white">{formatEur(c.realizat)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">{formatEur(c.estimat)}</td>
                </tr>
              ))}
              {clientiSortati.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    Niciun client pentru filtrul curent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
