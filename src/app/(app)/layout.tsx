import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayAndOverdueOpportunities } from "@/lib/data/opportunities";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSync } from "@/components/ThemeSync";
import { DailySummaryPopup } from "@/components/DailySummaryPopup";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import packageJson from "../../../package.json";

const appVersion = packageJson.version;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, theme, approved, module_access")
    .eq("id", data.user.id)
    .single();

  // Userul si-a confirmat emailul (altfel n-ar fi putut ajunge aici, Supabase
  // Auth blocheaza login-ul fara confirmare), dar contul nu a fost inca
  // aprobat de un admin - arata un ecran dedicat de asteptare, fara acces
  // la restul aplicatiei (fara Sidebar, fara fetch de date).
  if (profile && !profile.approved) {
    return <PendingApprovalScreen />;
  }

  const todayOpportunities = await getTodayAndOverdueOpportunities();

  // Vercel expune automat SHA-ul commit-ului curent la build (fara
  // configurare suplimentara) - afisam ultimele 7 caractere, identic cu ce
  // se vede in lista de Deployments din Vercel, ca sa stii usor pe ce
  // versiune lucrezi. Combinat cu numarul de versiune din package.json,
  // pe care il actualizezi manual cand vrei sa marchezi un release.
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  const deployVersion = commitSha ? `${appVersion} · ${commitSha}` : appVersion;

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <ThemeSync dbTheme={profile?.theme ?? "dark"} />
      <DailySummaryPopup opportunities={todayOpportunities} />
      <Sidebar
        userName={profile?.full_name ?? data.user.email ?? "Utilizator"}
        isAdmin={profile?.role === "admin"}
        moduleAccess={profile?.module_access ?? ["crm"]}
        deployVersion={deployVersion}
      />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">{children}</main>
    </div>
  );
}
