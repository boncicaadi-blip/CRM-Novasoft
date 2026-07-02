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
  Plug,
  FileBarChart,
  Target,
  Wallet,
  TrendingUp,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  /** Grupul intreg e vizibil doar pentru admin (ex: date financiare sensibile). */
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "pipeline",
    label: "CRM",
    icon: GitBranch,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/actiuni", label: "Actiuni", icon: ListChecks },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/dashboard/harta", label: "Harta", icon: Map },
      { href: "/rapoarte", label: "Raport Comercial", icon: FileBarChart },
    ],
  },
  {
    id: "creante",
    label: "Creante & Obligatii",
    icon: Wallet,
    adminOnly: true,
    items: [
      { href: "/creante", label: "Creante", icon: Wallet },
      { href: "/obligatii", label: "Obligatii", icon: Wallet },
    ],
  },
  {
    id: "venituri",
    label: "Venituri & Cheltuieli",
    icon: TrendingUp,
    items: [{ href: "/venituri-cheltuieli", label: "Venituri & Cheltuieli", icon: TrendingUp }],
  },
];

/** Evita ca /dashboard sa apara "activ" si cand suntem pe /dashboard/harta. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function findActiveGroupId(pathname: string, groups: NavGroup[]): string | null {
  return groups.find((g) => g.items.some((i) => isNavItemActive(pathname, i.href)))?.id ?? null;
}

export function Sidebar({
  userName,
  isAdmin = false,
  deployVersion = null,
}: {
  userName: string;
  isAdmin?: boolean;
  deployVersion?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSheetGroupId, setMobileSheetGroupId] = useState<string | null>(null);

  const visibleGroups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin);
  const activeGroupId = findActiveGroupId(pathname, visibleGroups) ?? visibleGroups[0]?.id ?? null;
  const [openGroupId, setOpenGroupId] = useState<string | null>(activeGroupId);
  const effectiveOpenGroupId = openGroupId ?? activeGroupId;

  const mobileSheetGroup = visibleGroups.find((g) => g.id === mobileSheetGroupId) ?? null;

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
            src="/icon-192.png"
            alt="NovaSales"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <p className="font-heading text-sm text-white">NovaSales</p>
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

      {/* Sidebar desktop (md+) - 3 grupe mari, fiecare expandabila */}
      <aside className="hidden h-screen w-60 flex-col border-r border-white/10 bg-[#111535] px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Image
            src="/icon-192.png"
            alt="NovaSales"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <div>
            <p className="font-heading text-sm leading-tight text-white">NovaSales</p>
            <p className="text-[11px] leading-tight text-slate-500">Novasoft CRM</p>
          </div>
        </div>

        <Link
          href="/oportunitati/noua"
          className="mb-5 flex items-center justify-center gap-1.5 rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
        >
          <Plus size={16} />
          Oportunitate noua
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = effectiveOpenGroupId === group.id;
            const groupHasActive = group.id === activeGroupId;
            return (
              <div key={group.id}>
                <button
                  onClick={() => setOpenGroupId(group.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                    groupHasActive
                      ? "text-white font-medium"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <GroupIcon size={17} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="ml-2 space-y-0.5 border-l border-white/10 pl-3">
                    {group.items.map((item) => {
                      const isActive = isNavItemActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                            isActive
                              ? "bg-white/10 text-white font-medium"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          }`}
                        >
                          <Icon size={15} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
                <>
                  <Link
                    href="/setari/utilizatori"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Users size={15} />
                    Utilizatori
                  </Link>
                  <Link
                    href="/setari/integrari"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Plug size={15} />
                    Integrari
                  </Link>
                  <Link
                    href="/setari/comercial"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Target size={15} />
                    Comercial
                  </Link>
                  <Link
                    href="/setari/nomenclatoare"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Settings size={15} />
                    Nomenclatoare
                  </Link>
                </>
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
          {deployVersion && (
            <p className="mt-1 px-2 text-[10px] text-slate-600">Versiunea {deployVersion}</p>
          )}
        </div>
      </aside>

      {/* Bottom nav mobil (sub md) - 3 categorii mari; tap deschide submeniul categoriei */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#111535] pb-[env(safe-area-inset-bottom)] md:hidden">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isActive = group.id === activeGroupId;
          return (
            <button
              key={group.id}
              onClick={() => setMobileSheetGroupId(group.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                isActive ? "text-[#E8007A]" : "text-slate-400"
              }`}
            >
              <GroupIcon size={20} />
              {group.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>

      {/* Sheet mobil cu paginile categoriei selectate */}
      {mobileSheetGroup && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/60 md:hidden"
          onClick={() => setMobileSheetGroupId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl border-t border-white/10 bg-[#111535] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <mobileSheetGroup.icon size={17} />
                {mobileSheetGroup.label}
              </p>
              <button
                onClick={() => setMobileSheetGroupId(null)}
                className="rounded-md p-1 text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {mobileSheetGroup.items.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSheetGroupId(null)}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
