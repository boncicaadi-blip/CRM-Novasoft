"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatEur } from "@/lib/format";
import { normalizeJudetName } from "@/lib/geo";
import { groupByJudetVenituri } from "@/lib/venituri-dashboard-analytics";
import { RomaniaMap } from "@/components/dashboard/map/RomaniaMap";
import type { VenitLinie } from "@/types/venituri";
import type { PartnerGrupInfo } from "@/lib/data/venituri";
import type { FeatureCollection, Geometry } from "geojson";

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

  const partnerJudetById = useMemo(
    () => new Map(partnersGrup.map((p) => [p.id, p.judet])),
    [partnersGrup]
  );

  const filteredLinii = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return venituriLinii;
    return venituriLinii.filter((l) => l.nume_client.toLowerCase().includes(q));
  }, [venituriLinii, search]);

  const data = useMemo(() => groupByJudetVenituri(filteredLinii, partnerJudetById), [filteredLinii, partnerJudetById]);

  const sorted = [...data].sort((a, b) => (metric === "count" ? b.count - a.count : b.arr - a.arr));

  const selectedNormalized = useMemo(
    () => new Set(selectedJudete.map(normalizeJudetName)),
    [selectedJudete]
  );

  // Clienti distincti (nu linii) din judetele selectate, cu venitul lor
  // realizat insumat - mai util decat o lista lunga de linii individuale.
  const clientiInSelectie = useMemo(() => {
    if (selectedJudete.length === 0) return [];
    const map = new Map<string, { nume: string; realizat: number; estimat: number }>();
    for (const l of filteredLinii) {
      const judet = l.partner_id ? partnerJudetById.get(l.partner_id) : null;
      if (!judet || !selectedNormalized.has(normalizeJudetName(judet))) continue;
      const cur = map.get(l.nume_client) ?? { nume: l.nume_client, realizat: 0, estimat: 0 };
      cur.realizat += l.venit_realizat ?? 0;
      cur.estimat += l.venit_estimat;
      map.set(l.nume_client, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.realizat - a.realizat);
  }, [filteredLinii, partnerJudetById, selectedNormalized, selectedJudete]);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Distributie clienti pe harta</h1>
          <p className="text-sm text-slate-500">Venituri, distribuite geografic pe judete, Romania</p>
        </div>
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

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta client..."
          className="w-full max-w-xs rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <RomaniaMap
            geoData={geoData}
            data={data}
            metric={metric}
            selectedJudete={selectedJudete}
            onSelectionChange={setSelectedJudete}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              {selectedJudete.length > 0 ? `Clienti: ${selectedJudete.join(", ")}` : "Top judete"}
            </p>
            {selectedJudete.length > 0 && (
              <button
                onClick={() => setSelectedJudete([])}
                className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
                title="Sterge selectia"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {selectedJudete.length > 0 ? (
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
              {clientiInSelectie.map((c) => (
                <div key={c.nume} className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
                  <p className="truncate text-sm text-white">{c.nume}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {formatEur(c.realizat)} realizat · {formatEur(c.estimat)} estimat
                  </p>
                </div>
              ))}
              {clientiInSelectie.length === 0 && (
                <p className="text-xs text-slate-500">Niciun client cu venit in judetele selectate.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.slice(0, 12).map((d) => (
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
              {sorted.length === 0 && <p className="text-xs text-slate-500">Niciun venit cu judet completat.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
