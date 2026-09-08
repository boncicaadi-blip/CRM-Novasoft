import { Resend } from "resend";

/**
 * Trimite un email prin Resend - foloseste RESEND_API_KEY din variabilele
 * de mediu (Vercel). Generic, reutilizabil din orice modul (Concedii,
 * Creante, Actiuni etc.) - fiecare modul isi construieste doar
 * subject/html-ul specific, apoi apeleaza asta.
 *
 * Nu arunca eroare daca esueaza - email-ul e un "nice to have" (in special
 * pentru module cu notificare in-aplicatie ca sursa principala de adevar),
 * doar loghează, ca sa nu pice actiunea principala din cauza unei probleme
 * cu email-ul.
 *
 * `from` implicit e generic ("Novasoft CRM") - fiecare modul poate
 * suprascrie cu un nume/adresa mai specifica daca vrea (ex. "Concedii
 * Novasoft <concedii@nova-soft.ro>").
 */
export async function trimiteEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("trimiteEmail: RESEND_API_KEY nu e configurat.");
    return;
  }

  // Default generic, indiferent de modul - fiecare modul care vrea un
  // expeditor propriu il specifica explicit prin `from` (ex. FROM_CONCEDII),
  // ca sa nu se "scurga" din greseala o adresa specifica unui modul catre
  // altul care a uitat sa specifice `from`.
  const from = params.from || "Novasoft CRM <notificari@nova-soft.ro>";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) console.error("trimiteEmail error:", error);
  } catch (err) {
    console.error("trimiteEmail exception:", err);
  }
}
