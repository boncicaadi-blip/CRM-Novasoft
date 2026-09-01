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
