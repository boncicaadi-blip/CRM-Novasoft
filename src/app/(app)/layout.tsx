import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

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
    .select("full_name")
    .eq("id", data.user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={profile?.full_name ?? data.user.email ?? "Utilizator"} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
