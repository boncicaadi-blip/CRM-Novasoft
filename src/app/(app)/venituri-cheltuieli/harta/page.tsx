import { readFile } from "fs/promises";
import path from "path";
import { getVenituriLinii, getPartnersGrupLookup } from "@/lib/data/venituri";
import { VenituriMapClient } from "@/components/venituri/harta/VenituriMapClient";
import type { FeatureCollection, Geometry } from "geojson";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function VenituriHartaPage() {
  await requireModuleAccess("venituri_cheltuieli", "venituri_harta");

  const [venituriLinii, partnersGrup, geoJsonRaw] = await Promise.all([
    getVenituriLinii(),
    getPartnersGrupLookup(),
    readFile(path.join(process.cwd(), "public", "romania-counties.geojson"), "utf-8"),
  ]);

  const geoData: FeatureCollection<Geometry, { name: string }> = JSON.parse(geoJsonRaw);

  return <VenituriMapClient geoData={geoData} venituriLinii={venituriLinii} partnersGrup={partnersGrup} />;
}
