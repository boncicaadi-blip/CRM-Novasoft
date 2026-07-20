import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { performAnafSyncForCron } from "@/lib/actions/anaf-sync";

/**
 * Apelata automat de Vercel Cron (vezi vercel.json) la fiecare 3 ore.
 * Protejata prin CRON_SECRET - Vercel trimite automat header-ul
 * "Authorization: Bearer {CRON_SECRET}" pentru cron job-uri configurate in
 * vercel.json, daca variabila de mediu CRON_SECRET e setata in proiect.
 *
 * Foloseste un client Supabase cu cheia de service-role (nu are sesiune de
 * utilizator - un cron job nu poate avea cookie-uri de autentificare).
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
    const result = await performAnafSyncForCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Eroare necunoscuta." },
      { status: 500 }
    );
  }
}
