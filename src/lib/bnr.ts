import { XMLParser } from "fast-xml-parser";

// BNR si-a schimbat sistemul - adresa veche (www.bnr.ro/files/xml/years/...)
// redirectioneaza acum catre pagina principala (HTML), nu mai serveste XML.
// Adresa noua e pe subdomeniul curs.bnr.ro.
const BNR_YEAR_URL = (year: number) => `https://curs.bnr.ro/files/xml/years/nbrfxrates${year}.xml`;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface BnrRate {
  "@_currency": string;
  "@_multiplier"?: string;
  "#text": number | string;
}

interface BnrCube {
  "@_date": string;
  Rate?: BnrRate | BnrRate[];
}

export interface BnrRateRow {
  data: string; // YYYY-MM-DD
  moneda: string;
  curs: number;
}

/**
 * Parseaza XML-ul BNR (structura reala, cu namespace implicit
 * xmlns="http://www.bnr.ro/xsd" - nu foloseste prefixe, deci nu e nevoie de
 * removeNSPrefix):
 *
 * <DataSet xmlns="...">
 *   <Body>
 *     <Cube date="2026-07-20">
 *       <Rate currency="EUR">4.9765</Rate>
 *       <Rate currency="HUF" multiplier="100">1.35</Rate>
 *       ...
 *     </Cube>
 *     ... (un Cube per zi lucratoare, pentru fisierul anual)
 *   </Body>
 * </DataSet>
 */
export function parseBnrXml(xml: string): BnrRateRow[] {
  const parsed = parser.parse(xml);
  const cubes = parsed.DataSet?.Body?.Cube;
  const cubeArray: BnrCube[] = Array.isArray(cubes) ? cubes : cubes ? [cubes] : [];

  const rows: BnrRateRow[] = [];
  for (const cube of cubeArray) {
    const rateArray = Array.isArray(cube.Rate) ? cube.Rate : cube.Rate ? [cube.Rate] : [];
    for (const rate of rateArray) {
      const multiplier = rate["@_multiplier"] ? Number(rate["@_multiplier"]) : 1;
      const raw = typeof rate === "object" && "#text" in rate ? rate["#text"] : rate;
      const curs = Number(raw) / multiplier;
      if (!cube["@_date"] || !rate["@_currency"] || Number.isNaN(curs)) continue;
      rows.push({ data: cube["@_date"], moneda: rate["@_currency"], curs });
    }
  }
  return rows;
}

/** Descarca si parseaza tot istoricul unui an de la BNR - un singur fisier, toate zilele, toate monedele. */
export async function fetchBnrYearRates(year: number): Promise<BnrRateRow[]> {
  const resp = await fetch(BNR_YEAR_URL(year), {
    cache: "no-store",
    headers: {
      // Unele servere resping cereri fara User-Agent, tratandu-le ca bot -
      // il trimitem explicit, ca sa nu riscam un raspuns/redirect diferit
      // fata de ce am testat manual in browser.
      "User-Agent": "Mozilla/5.0 (compatible; NovaSalesCRM/1.0; +https://crm.nova-soft.ro)",
      Accept: "application/xml,text/xml,*/*",
    },
  });
  if (!resp.ok) {
    throw new Error(`BNR a raspuns cu eroare (${resp.status}) pentru anul ${year}. URL: ${BNR_YEAR_URL(year)}`);
  }
  const xml = await resp.text();

  // Daca BNR schimba din nou adresa/sistemul, un fetch "reusit" (200 OK)
  // poate totusi sa fi fost redirectionat tacit catre o pagina HTML, nu
  // XML-ul real - fara aceasta verificare, ar pica direct pe cache-ul vechi
  // fara nicio eroare vizibila, exact bug-ul intalnit data trecuta.
  if (!xml.includes("<DataSet") || !xml.includes("<Cube")) {
    throw new Error(
      `Raspunsul de la BNR pentru anul ${year} nu pare sa fie XML valid (status ${resp.status}, url final ${resp.url}, ${xml.length} caractere primite) - posibil BNR si-a schimbat din nou adresa/formatul.`
    );
  }

  return parseBnrXml(xml);
}
