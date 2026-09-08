"use server";

import { getCreante } from "@/lib/data/creante";
import { getPartnerGroupMap } from "@/lib/data/partners";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import type { Creanta } from "@/types/creante";

export interface MembruGrup {
  nume: string;
  soldTotal: number;
}

export interface GrupNotificare {
  label: string; // nume_grup, sau nume_firma daca nu are grup
  esteGrup: boolean; // true daca reprezinta mai multe firme, false daca e o singura firma
  soldTotal: number;
  nrFacturiRestante: number;
  membri: MembruGrup[]; // doar cand esteGrup - firmele individuale din grup, selectabile separat
}

function grupeazaLabel(c: Creanta, groupMap: Record<string, string>): string {
  return (c.partner_id && groupMap[c.partner_id]) || c.nume_firma;
}

/** Grupurile (cu firmele individuale din ele) si firmele fara grup, toate
 * cu sold neincasat - lista ierarhica pentru picker-ul de notificare. */
export async function getGrupuriCuSoldAction(): Promise<GrupNotificare[]> {
  await requireModuleAccess("creante_obligatii", "creante_dashboard");

  const [creante, groupMap] = await Promise.all([getCreante(), getPartnerGroupMap()]);
  const azi = new Date().toISOString().slice(0, 10);

  const grupuri = new Map<string, { soldTotal: number; nrFacturiRestante: number; firme: Map<string, number> }>();

  for (const c of creante) {
    if (c.sold <= 0) continue;
    const label = grupeazaLabel(c, groupMap);
    const existent = grupuri.get(label) ?? { soldTotal: 0, nrFacturiRestante: 0, firme: new Map<string, number>() };
    existent.soldTotal += c.sold;
    if (c.data_scadenta && c.data_scadenta < azi) existent.nrFacturiRestante += 1;
    existent.firme.set(c.nume_firma, (existent.firme.get(c.nume_firma) ?? 0) + c.sold);
    grupuri.set(label, existent);
  }

  const rezultat: GrupNotificare[] = Array.from(grupuri.entries()).map(([label, v]) => {
    const esteGrup = v.firme.size > 1 || !v.firme.has(label);
    return {
      label,
      esteGrup,
      soldTotal: v.soldTotal,
      nrFacturiRestante: v.nrFacturiRestante,
      membri: esteGrup
        ? Array.from(v.firme.entries())
            .map(([nume, soldTotal]) => ({ nume, soldTotal }))
            .sort((a, b) => b.soldTotal - a.soldTotal)
        : [],
    };
  });

  return rezultat.sort((a, b) => b.soldTotal - a.soldTotal);
}

export interface FacturaNotificarePreview {
  nr_factura: string;
  data_scadenta: string | null;
  total_factura: number;
  sold: number;
  zile_intarziere: number;
}

export interface DateNotificareGrup {
  label: string;
  soldTotal: number;
  facturiRestante: FacturaNotificarePreview[];
  facturiUrmatoare: FacturaNotificarePreview[];
}

/**
 * Facturile cu sold neincasat pentru o selectie - fie un grup intreg
 * (toate firmele din el), fie o singura firma anume (cand vrei sa
 * selectezi doar o societate din grup, nu tot grupul).
 */
export async function getDateNotificareGrupAction(
  selectie: { tip: "grup" | "firma"; valoare: string }
): Promise<DateNotificareGrup> {
  await requireModuleAccess("creante_obligatii", "creante_dashboard");

  const [creante, groupMap] = await Promise.all([getCreante(), getPartnerGroupMap()]);
  const azi = new Date();
  const aziStr = azi.toISOString().slice(0, 10);

  const facturiSelectie = creante.filter((c: Creanta) => {
    if (c.sold <= 0) return false;
    if (selectie.tip === "firma") return c.nume_firma === selectie.valoare;
    return grupeazaLabel(c, groupMap) === selectie.valoare;
  });

  const facturiRestante = facturiSelectie
    .filter((c) => c.data_scadenta && c.data_scadenta < aziStr)
    .map((c) => {
      const zile = c.data_scadenta ? Math.floor((azi.getTime() - new Date(c.data_scadenta).getTime()) / 86400000) : 0;
      return {
        nr_factura: c.nr_factura,
        data_scadenta: c.data_scadenta,
        total_factura: c.total_factura,
        sold: c.sold,
        zile_intarziere: zile,
      };
    })
    .sort((a, b) => b.zile_intarziere - a.zile_intarziere);

  const facturiUrmatoare = facturiSelectie
    .filter((c) => !c.data_scadenta || c.data_scadenta >= aziStr)
    .map((c) => ({
      nr_factura: c.nr_factura,
      data_scadenta: c.data_scadenta,
      total_factura: c.total_factura,
      sold: c.sold,
      zile_intarziere: 0,
    }))
    .sort((a, b) => (a.data_scadenta ?? "").localeCompare(b.data_scadenta ?? ""));

  const soldTotal = facturiSelectie.reduce((s, c) => s + c.sold, 0);

  return { label: selectie.valoare, soldTotal, facturiRestante, facturiUrmatoare };
}

/**
 * Genereaza PDF-ul notificarii de plata - primeste explicit lista de
 * numere de factura de inclus (selectate manual in interfata), nu toate
 * automat, ca sa poata fi exclusa o factura anume daca e cazul.
 */
export async function genereazaNotificarePlataAction(
  numeClient: string,
  facturiRestante: FacturaNotificarePreview[],
  facturiUrmatoare: FacturaNotificarePreview[]
): Promise<{ success: boolean; message?: string; base64?: string; numeFisier?: string }> {
  await requireModuleAccess("creante_obligatii", "creante_dashboard");

  if (facturiRestante.length === 0 && facturiUrmatoare.length === 0) {
    return { success: false, message: "Selecteaza cel putin o factura pentru notificare." };
  }

  try {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { NotificarePlataDocument } = await import("@/lib/pdf/notificare-plata");

    const dataDocument = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
    const soldTotal =
      facturiRestante.reduce((s, f) => s + f.sold, 0) + facturiUrmatoare.reduce((s, f) => s + f.sold, 0);

    const buffer = await renderToBuffer(
      NotificarePlataDocument({
        data: { numeClient, facturiRestante, facturiUrmatoare, soldTotal, dataDocument },
      })
    );

    const numeFisier = `Notificare_plata_${numeClient.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return { success: true, base64: buffer.toString("base64"), numeFisier };
  } catch (err) {
    console.error("genereazaNotificarePlataAction error:", err);
    return { success: false, message: err instanceof Error ? err.message : "Eroare la generarea PDF-ului." };
  }
}
