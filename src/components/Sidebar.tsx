"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, GitBranch, CalendarDays, Settings, Plus, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/setari/nomenclatoare", label: "Setari", icon: Settings },
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
    <>
      {/* Header mobil (sub md) - logo + utilizator + logout, navigarea e in bottom bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#111535] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8007A] text-xs font-bold text-[#0B0D1A]">
            N
          </div>
          <p className="font-heading text-sm text-white">Novasoft CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/oportunitati/noua"
            className="flex items-center gap-1 rounded-md bg-[#E8007A] px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A]"
          >
            <Plus size={14} />
            Noua
          </Link>
          <button
            onClick={handleLogout}
            title="Deconectare"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Sidebar desktop (md+) */}
      <aside className="hidden h-screen w-60 flex-col border-r border-white/10 bg-[#111535] px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8007A] text-sm font-bold text-[#0B0D1A]">
            N
          </div>
          <div>
            <p className="font-heading text-sm leading-tight text-white">Novasoft CRM</p>
            <p className="text-[11px] leading-tight text-slate-500">Pipeline</p>
          </div>
        </div>

        <Link
          href="/oportunitati/noua"
          className="mb-5 flex items-center justify-center gap-1.5 rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
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

      {/* Bottom nav mobil (sub md) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#111535] md:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                isActive ? "text-[#E8007A]" : "text-slate-400"
              }`}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
