import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchBnrYearRates } from "@/lib/bnr";

/**
 * Apelata automat de Vercel Cron (vezi vercel.json), o data pe zi, dupa ora
 * 13:00 (ora Romaniei) - momentul in care BNR publica cursul zilei. Descarca
 * anul curent de la BNR si il salveaza in cache (curs_valutar), ca sa fie
 * mereu la zi fara sa depinda de cineva care cauta manual un curs.
 *
 * Protejata prin CRON_SECRET, la fel ca celelalte cron job-uri.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, message: "CRON_SECRET nu este configurat in Vercel - sincronizarea automata e dezactivata." },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Neautorizat." }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const an = new Date().getFullYear();
    const rows = await fetchBnrYearRates(an);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: `BNR nu a intors niciun rand pentru anul ${an}.` });
    }

    const payload = rows.map((r) => ({ data: r.data, moneda: r.moneda, curs: r.curs }));
    const { error } = await supabase.from("curs_valutar").upsert(payload, { onConflict: "data,moneda" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: `Actualizat cursul BNR pentru ${an} - ${rows.length} randuri.` });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Eroare necunoscuta." },
      { status: 500 }
    );
  }
}
