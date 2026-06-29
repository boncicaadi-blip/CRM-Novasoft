"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ListChecks,
  LayoutDashboard,
  GitBranch,
  CalendarDays,
  Map,
  Settings,
  Plus,
  LogOut,
  User,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/actiuni", label: "Actiuni", icon: ListChecks },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/harta", label: "Harta", icon: Map },
  { href: "/setari/nomenclatoare", label: "Setari", icon: Settings },
];

/** Pe mobil aratam doar 5 din cele 6, ca sa nu fie prea inghesuit - Setari ramane accesibil din meniul de Profil pe desktop, sau direct la /setari/nomenclatoare pe mobil prin url. */
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((i) => i.href !== "/setari/nomenclatoare");

/** Evita ca /dashboard sa apara "activ" si cand suntem pe /dashboard/harta. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function Sidebar({
  userName,
  isAdmin = false,
}: {
  userName: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Image
            src="/icon-novasoft-indigo.png"
            alt="Novasoft"
            width={28}
            height={28}
            className="rounded-lg"
          />
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
          <Link
            href="/profil"
            title="Profilul meu"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <User size={16} />
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
        <div className="mb-6 px-2">
          <Image
            src="/logo-novasoft.png"
            alt="Novasoft"
            width={150}
            height={32}
            className="h-7 w-auto"
            priority
          />
          <p className="mt-1 text-[11px] leading-tight text-slate-500">CRM Pipeline</p>
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
            const isActive = isNavItemActive(pathname, item.href);
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

        <div className="relative border-t border-white/10 pt-3">
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-white/10 bg-[#161B45] p-1 shadow-xl">
              <Link
                href="/profil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <User size={15} />
                Profilul meu
              </Link>
              {isAdmin && (
                <Link
                  href="/setari/utilizatori"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Users size={15} />
                  Utilizatori
                </Link>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-white/5">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-slate-200">
                {userName.charAt(0).toUpperCase()}
              </div>
              <p className="flex-1 truncate text-sm text-slate-300">{userName}</p>
            </button>
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
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
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
