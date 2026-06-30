import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ThemeSync } from "@/components/ThemeSync";

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
    .select("full_name, role, theme")
    .eq("id", data.user.id)
    .single();

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <ThemeSync dbTheme={profile?.theme ?? "dark"} />
      <Sidebar
        userName={profile?.full_name ?? data.user.email ?? "Utilizator"}
        isAdmin={profile?.role === "admin"}
      />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">{children}</main>
    </div>
  );
}
