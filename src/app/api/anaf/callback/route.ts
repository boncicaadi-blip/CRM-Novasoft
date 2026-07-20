import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANAF_TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token";
const REDIRECT_URI = process.env.ANAF_REDIRECT_URI ?? "https://crm.nova-soft.ro/api/anaf/callback";

interface AnafExtra {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at?: string;
}

/**
 * ANAF redirectioneaza aici browser-ul dupa ce utilizatorul s-a autentificat
 * cu certificatul digital si a autorizat aplicatia. Schimbam codul primit pe
 * un access_token + refresh_token si le salvam (in api_credentials, id='anaf',
 * coloana extra) - de acolo le foloseste restul integrarii.
 *
 * Nota: nu a putut fi testat live impotriva ANAF (necesita Client ID/Secret
 * reale + certificat digital activ) - schimbul de cod urmeaza intocmai
 * specificatia OAuth2 documentata de ANAF, dar prima incercare reala merita
 * verificata cu atentie.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/setari/integrari?anaf_error=${encodeURIComponent(errorParam)}`, request.url)
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/setari/integrari?anaf_error=cod_lipsa", request.url));
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: credRow } = await supabase
    .from("api_credentials")
    .select("username, password")
    .eq("id", "anaf")
    .single();

  if (!credRow?.username || !credRow?.password) {
    return NextResponse.redirect(new URL("/setari/integrari?anaf_error=client_id_lipsa", request.url));
  }

  try {
    const basicAuth = Buffer.from(`${credRow.username}:${credRow.password}`).toString("base64");
    const tokenResponse = await fetch(ANAF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // ANAF specifica explicit in documentatia oficiala sa se trimita
        // Client ID/Secret ca Basic Auth header, nu ca parametri in body.
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        token_content_type: "jwt",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("ANAF token exchange failed:", tokenResponse.status, errText);
      return NextResponse.redirect(new URL("/setari/integrari?anaf_error=schimb_token_esuat", request.url));
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
    };

    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 90 * 24 * 3600) * 1000).toISOString();

    const extra: AnafExtra = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("api_credentials")
      .update({ extra, updated_by: userData.user.id, updated_at: new Date().toISOString() })
      .eq("id", "anaf");

    if (saveError) {
      console.error("ANAF token save failed:", saveError.message);
      return NextResponse.redirect(new URL("/setari/integrari?anaf_error=salvare_esuata", request.url));
    }

    return NextResponse.redirect(new URL("/setari/integrari?anaf_success=1", request.url));
  } catch (err) {
    console.error("ANAF callback error:", err);
    return NextResponse.redirect(new URL("/setari/integrari?anaf_error=eroare_neasteptata", request.url));
  }
}
