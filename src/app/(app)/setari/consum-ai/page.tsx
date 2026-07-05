import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/BackButton";
import { getAiUsageLog, summarizeAiUsage } from "@/lib/data/ai-usage";
import { AiUsageReport } from "@/components/setari/AiUsageReport";

export default async function ConsumAiPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (myProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const rows = await getAiUsageLog();
  const summary = summarizeAiUsage(rows);

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-2">
        <BackButton />
      </div>
      <AiUsageReport summary={summary} rows={rows.slice(0, 50)} />
    </div>
  );
}
