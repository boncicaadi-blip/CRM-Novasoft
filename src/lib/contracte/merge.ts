import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * Completeaza un draft de contract (.docx cu placeholder-uri {{tag}}) cu
 * datele date - intoarce buffer-ul documentului final, gata de salvat.
 * Placeholder-ele care nu au valoare in `data` raman goale (nu arunca
 * eroare) - se vede clar in documentul rezultat ce a ramas necompletat.
 */
export function mergeContractTemplate(templateBuffer: Buffer, data: Record<string, string>): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" }, // draft-urile folosesc {{tag}}, nu {tag} (implicitul din docxtemplater)
    nullGetter: () => "___", // placeholder ramas necompletat - vizibil clar, nu dispare tacut
  });

  doc.render(data);

  return doc.getZip().generate({ type: "nodebuffer" });
}

/** Extrage textul brut (fara formatare) dintr-un .docx - folosit ca sa
 * trimitem continutul contractului generat catre Claude, pentru validare. */
export function extrageTextDinDocx(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  const xml = zip.files["word/document.xml"]?.asText() ?? "";
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  return matches
    .map((m) => m[1])
    .join(" ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
