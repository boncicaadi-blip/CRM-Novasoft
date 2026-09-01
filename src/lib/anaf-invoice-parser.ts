import { XMLParser } from "fast-xml-parser";
import { cleanAndValidateCif } from "@/lib/cif-utils";

export interface ParsedAnafInvoice {
  nrFactura: string | null;
  dataFactura: string | null;
  dataScadenta: string | null;
  serviciu: string | null;
  valoare: number | null;
  /** Suma ramasa de plata (BT-115) - 0 inseamna ca factura era deja achitata integral la emitere (ex. bon fiscal POS). */
  sumaRamasaDePlata: number | null;
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
  return cleanAndValidateCif(text);
}

/**
 * Unele softuri de facturare (ex. Synergo) prefixeaza numarul de factura cu
 * o serie interna (ex. "WOL1002899") care nu apare in restul aplicatiei,
 * unde facturile sunt numerotate simplu ("1002899"). Pastram doar de la
 * prima cifra incolo, ca deduplicarea cu Creante/Obligatii sa functioneze
 * corect (altfel "WOL1002899" si "1002899" ar fi considerate facturi
 * diferite, desi sunt aceeasi).
 */
function cleanNrFactura(value: unknown): string | null {
  const text = textOf(value);
  if (!text) return null;
  const match = text.match(/^[^\d]*(\d.*)$/);
  return match ? match[1] : text;
}

function toUpperName(value: unknown): string | null {
  const text = textOf(value);
  return text ? text.toUpperCase() : null;
}

/**
 * Extrage datele esentiale dintr-un XML de factura UBL 2.1 / CIUS-RO, asa
 * cum e descarcat de la ANAF (fie ca "Invoice", fie ca "CreditNote" pentru
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

    // Valoarea totala a facturii = TaxInclusiveAmount (BT-112, totalul cu
    // TVA). PayableAmount (BT-115) e suma RAMASA de plata - poate fi 0
    // pentru facturi deja achitate integral (ex. bonuri fiscale/POS, gen
    // LIDL), ceea ce ar da gresit "valoare 0" desi factura are o valoare
    // reala. Cadem pe PayableAmount doar daca TaxInclusiveAmount lipseste.
    const taxInclusiveText = textOf(invoice.LegalMonetaryTotal?.TaxInclusiveAmount);
    const payableText = textOf(invoice.LegalMonetaryTotal?.PayableAmount);
    const valoareText = taxInclusiveText ?? payableText;

    // Scadenta poate aparea fie direct pe Invoice (cbc:DueDate - cel mai
    // comun in CIUS-RO), fie in interiorul PaymentMeans (mai rar).
    const dataScadenta = textOf(invoice.DueDate) ?? textOf(invoice.PaymentMeans?.PaymentDueDate);

    // Serviciul = denumirea de pe prima linie a facturii (InvoiceLine poate
    // fi un singur obiect sau un array, in functie de cate linii are
    // factura - tratam ambele cazuri).
    const liniiRaw = invoice.InvoiceLine ?? invoice.CreditNoteLine;
    const linii = Array.isArray(liniiRaw) ? liniiRaw : liniiRaw ? [liniiRaw] : [];
    const serviciu = textOf(linii[0]?.Item?.Name ?? linii[0]?.Item?.Description);

    return {
      nrFactura: cleanNrFactura(invoice.ID),
      dataFactura: textOf(invoice.IssueDate),
      dataScadenta,
      serviciu,
      valoare: valoareText !== null ? Number(valoareText) : null,
      sumaRamasaDePlata: payableText !== null ? Number(payableText) : null,
      moneda: textOf(invoice.DocumentCurrencyCode) ?? "RON",
      cifFurnizor: cleanCif(supplierParty?.PartyTaxScheme?.CompanyID ?? supplierParty?.PartyLegalEntity?.CompanyID),
      numeFurnizor: toUpperName(supplierParty?.PartyLegalEntity?.RegistrationName ?? supplierParty?.PartyName?.Name),
      cifClient: cleanCif(customerParty?.PartyTaxScheme?.CompanyID ?? customerParty?.PartyLegalEntity?.CompanyID),
      numeClient: toUpperName(customerParty?.PartyLegalEntity?.RegistrationName ?? customerParty?.PartyName?.Name),
    };
  } catch (err) {
    console.error("parseAnafInvoiceXml error:", err);
    return null;
  }
}
