import { XMLParser } from "fast-xml-parser";

export interface ParsedAnafInvoice {
  nrFactura: string | null;
  dataFactura: string | null;
  valoare: number | null;
  moneda: string;
  cifFurnizor: string | null;
  numeFurnizor: string | null;
  cifClient: string | null;
  numeClient: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // UBL foloseste prefixe de namespace (cbc:, cac:) peste tot - le eliminam,
  // altfel fiecare cheie ar trebui accesata cu prefixul exact.
  removeNSPrefix: true,
});

function textOf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return String(value);
}

function cleanCif(value: unknown): string | null {
  const text = textOf(value);
  if (!text) return null;
  return text.replace(/^RO/i, "").trim() || null;
}

/**
 * Extrage datele esentiale (nr. factura, data, valoare, CIF si nume
 * furnizor/client) dintr-un XML de factura UBL 2.1 / CIUS-RO, asa cum e
 * descarcat de la ANAF (fie ca "Invoice", fie ca "CreditNote" pentru
 * facturi de stornare). Returneaza null daca XML-ul nu poate fi parsat sau
 * nu pare o factura (ex. un raport de erori ANAF, nu un document UBL).
 */
export function parseAnafInvoiceXml(xml: string): ParsedAnafInvoice | null {
  try {
    const data = parser.parse(xml);
    const invoice = data.Invoice ?? data.CreditNote;
    if (!invoice) return null;

    const supplierParty = invoice.AccountingSupplierParty?.Party;
    const customerParty = invoice.AccountingCustomerParty?.Party;

    const valoareText = textOf(invoice.LegalMonetaryTotal?.PayableAmount);

    return {
      nrFactura: textOf(invoice.ID),
      dataFactura: textOf(invoice.IssueDate),
      valoare: valoareText !== null ? Number(valoareText) : null,
      moneda: textOf(invoice.DocumentCurrencyCode) ?? "RON",
      cifFurnizor: cleanCif(supplierParty?.PartyLegalEntity?.CompanyID ?? supplierParty?.PartyTaxScheme?.CompanyID),
      numeFurnizor: textOf(supplierParty?.PartyLegalEntity?.RegistrationName ?? supplierParty?.PartyName?.Name),
      cifClient: cleanCif(customerParty?.PartyLegalEntity?.CompanyID ?? customerParty?.PartyTaxScheme?.CompanyID),
      numeClient: textOf(customerParty?.PartyLegalEntity?.RegistrationName ?? customerParty?.PartyName?.Name),
    };
  } catch (err) {
    console.error("parseAnafInvoiceXml error:", err);
    return null;
  }
}
