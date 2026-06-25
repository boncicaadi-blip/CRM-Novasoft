"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, GitBranch, Plus, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/10 bg-[#0E1420] px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DD4BF] text-sm font-bold text-[#0B0F14]">
          P
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Pipeline</p>
          <p className="text-[11px] leading-tight text-slate-500">Strategie 2026</p>
        </div>
      </div>

      <Link
        href="/oportunitati/noua"
        className="mb-5 flex items-center justify-center gap-1.5 rounded-md bg-[#2DD4BF] py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#5EEAD4]"
      >
        <Plus size={16} />
        Oportunitate noua
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-slate-200">
            {userName.charAt(0).toUpperCase()}
          </div>
          <p className="flex-1 truncate text-sm text-slate-300">{userName}</p>
          <button
            onClick={handleLogout}
            title="Deconectare"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
