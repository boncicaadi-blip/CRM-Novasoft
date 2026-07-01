import { readFile } from "fs/promises";
import path from "path";
import { getOpportunities } from "@/lib/data/opportunities";
import { MapDashboardClient } from "@/components/dashboard/map/MapDashboardClient";
import type { FeatureCollection, Geometry } from "geojson";

export default async function MapDashboardPage() {
  const [opportunities, geoJsonRaw] = await Promise.all([
    getOpportunities(),
    readFile(path.join(process.cwd(), "public", "romania-counties.geojson"), "utf-8"),
  ]);

  const geoData: FeatureCollection<Geometry, { name: string }> = JSON.parse(geoJsonRaw);

  return <MapDashboardClient geoData={geoData} opportunities={opportunities} />;
}
