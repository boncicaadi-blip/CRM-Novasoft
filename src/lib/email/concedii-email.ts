// Sabloane de email specifice modulului Concedii - trimiterea efectiva
// (Resend) e in src/lib/email/resend.ts, reutilizabila din orice modul.
export { trimiteEmail } from "@/lib/email/resend";

const CULOARE_BRAND = "#E8007A";
export const FROM_CONCEDII = "Concedii Novasoft <concedii@nova-soft.ro>";

export function emailCerereNoua(params: {
  numeAngajat: string;
  tip: string;
  dataInceput: string;
  dataSfarsit: string;
  nrZile: number;
  observatii: string | null;
  linkAprobare: string;
}): { subject: string; html: string } {
  return {
    subject: `Cerere de concediu noua - ${params.numeAngajat}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: ${CULOARE_BRAND};">Cerere noua de concediu</h2>
        <p><strong>${params.numeAngajat}</strong> a trimis o cerere de concediu, in asteptarea aprobarii tale.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #666;">Tip</td><td style="padding: 6px 0;">${params.tip}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Interval</td><td style="padding: 6px 0;">${params.dataInceput} &rarr; ${params.dataSfarsit}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Zile lucratoare</td><td style="padding: 6px 0;">${params.nrZile}</td></tr>
          ${params.observatii ? `<tr><td style="padding: 6px 0; color: #666;">Observatii</td><td style="padding: 6px 0;">${params.observatii}</td></tr>` : ""}
        </table>
        <a href="${params.linkAprobare}" style="display: inline-block; background: ${CULOARE_BRAND}; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Vezi si aproba cererea
        </a>
      </div>
    `,
  };
}

export function emailRaspunsCerere(params: {
  aprobat: boolean;
  tip: string;
  dataInceput: string;
  dataSfarsit: string;
  nrZile: number;
  linkCereri: string;
}): { subject: string; html: string } {
  const status = params.aprobat ? "aprobata" : "respinsa";
  const culoare = params.aprobat ? "#22C55E" : "#EF4444";
  return {
    subject: `Cererea ta de concediu a fost ${status}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: ${culoare};">Cerere ${status}</h2>
        <p>Cererea ta de concediu a fost <strong>${status}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #666;">Tip</td><td style="padding: 6px 0;">${params.tip}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Interval</td><td style="padding: 6px 0;">${params.dataInceput} &rarr; ${params.dataSfarsit}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Zile lucratoare</td><td style="padding: 6px 0;">${params.nrZile}</td></tr>
        </table>
        <a href="${params.linkCereri}" style="display: inline-block; background: ${culoare}; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Vezi cererile mele
        </a>
      </div>
    `,
  };
}
