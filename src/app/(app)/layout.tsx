import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayAndOverdueOpportunities } from "@/lib/data/opportunities";
import { getAnafFacturiNoiCount } from "@/lib/data/anaf";
import { getPendingUsersCount } from "@/lib/data/users";
import { getCereriDeAprobatCount, getCereriNecititite } from "@/lib/data/concedii";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSync } from "@/components/ThemeSync";
import { DailySummaryPopup } from "@/components/DailySummaryPopup";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import packageJson from "../../../package.json";
import { VERSION_DATE } from "@/lib/version";

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
    .select("full_name, role, theme, approved, module_access, submodule_access, arata_popup_zilnic")
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
  const isAdmin = profile?.role === "admin";
  const anafFacturiNoiCount = isAdmin ? await getAnafFacturiNoiCount() : 0;
  const pendingUsersCount = isAdmin ? await getPendingUsersCount() : 0;
  const [cereriDeAprobat, cererileMeleNecititite] = await Promise.all([
    getCereriDeAprobatCount(),
    getCereriNecititite(),
  ]);

  // Vercel expune automat SHA-ul commit-ului curent la build (fara
  // configurare suplimentara) - afisam ultimele 7 caractere, identic cu ce
  // se vede in lista de Deployments din Vercel, ca sa stii usor pe ce
  // versiune lucrezi. Combinat cu numarul de versiune din package.json
  // (afisat ca "V0.35", fara ".0" final) si data ultimei versiuni
  // (VERSION_DATE, din src/lib/version.ts) - actualizate manual de Claude
  // de fiecare data cand livreaza o arhiva noua.
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  const [major, minor, patch] = appVersion.split(".");
  const versionLabel = patch === "0" ? `V${major}.${minor}` : `V${major}.${minor}.${patch}`;
  const versionDateLabel = new Date(VERSION_DATE).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const deployVersion = [versionLabel, versionDateLabel, commitSha].filter(Boolean).join(" · ");

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <ThemeSync dbTheme={profile?.theme ?? "dark"} />
      {profile?.arata_popup_zilnic !== false && <DailySummaryPopup opportunities={todayOpportunities} />}
      <Sidebar
        userName={profile?.full_name ?? data.user.email ?? "Utilizator"}
        isAdmin={isAdmin}
        moduleAccess={profile?.module_access ?? ["crm"]}
        submoduleAccess={profile?.submodule_access ?? []}
        deployVersion={deployVersion}
        anafFacturiNoiCount={anafFacturiNoiCount}
        pendingUsersCount={pendingUsersCount}
        badgeCounts={{ cereriDeAprobat, cererileMeleNecititite }}
      />
      <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">{children}</main>
    </div>
  );
}
