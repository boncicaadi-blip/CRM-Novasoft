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
  Sparkles,
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
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/modules";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Cheia de submodul (vezi SUBMODULES din lib/modules) - daca lipseste,
   * itemul e vizibil doar cu acces la modulul intreg (fara granularitate). */
  submodule?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  /** Modulul mare de care apartine grupul - controleaza vizibilitatea pe
   * baza module_access al userului (adminii vad mereu tot). */
  moduleKey: ModuleKey;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "pipeline",
    label: "CRM",
    icon: GitBranch,
    moduleKey: "crm",
    items: [
      { href: "/pipeline", label: "Pipeline", icon: GitBranch, submodule: "pipeline" },
      { href: "/actiuni", label: "Actiuni", icon: ListChecks, submodule: "actiuni" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, submodule: "calendar" },
      { href: "/dashboard/harta", label: "Harta", icon: Map, submodule: "harta" },
      { href: "/dashboard", label: "Dashboard Comercial", icon: LayoutDashboard, submodule: "dashboard" },
      { href: "/rapoarte", label: "Raport Comercial", icon: FileBarChart, submodule: "raport_comercial" },
      { href: "/rapoarte/lunar", label: "Raport Comercial Lunar", icon: FileBarChart, submodule: "raport_comercial_lunar" },
    ],
  },
  {
    id: "creante",
    label: "Credit Control",
    icon: Wallet,
    moduleKey: "creante_obligatii",
    items: [
      { href: "/creante", label: "Creante", icon: Wallet },
      { href: "/creante/dashboard", label: "Dashboard Creante", icon: FileBarChart },
      { href: "/obligatii", label: "Obligatii", icon: Wallet },
      { href: "/obligatii/dashboard", label: "Dashboard Obligatii", icon: FileBarChart },
    ],
  },
  {
    id: "venituri",
    label: "Financiar",
    icon: TrendingUp,
    moduleKey: "venituri_cheltuieli",
    items: [
      { href: "/venituri-cheltuieli", label: "Venituri", icon: TrendingUp, submodule: "venituri" },
      { href: "/venituri-cheltuieli/dashboard", label: "Dashboard Venituri", icon: FileBarChart, submodule: "venituri_dashboard" },
      { href: "/venituri-cheltuieli/harta", label: "Harta Venituri", icon: Map, submodule: "venituri_harta" },
      { href: "/venituri-cheltuieli/cheltuieli", label: "Cheltuieli", icon: Wallet, submodule: "cheltuieli" },
      { href: "/venituri-cheltuieli/cheltuieli/dashboard", label: "Dashboard Cheltuieli", icon: FileBarChart, submodule: "cheltuieli_dashboard" },
    ],
  },
  {
    id: "management",
    label: "Management",
    icon: LayoutDashboard,
    moduleKey: "management",
    items: [
      { href: "/management", label: "Rapoarte generale", icon: LayoutDashboard },
      { href: "/management/pl", label: "P&L detaliat", icon: FileBarChart },
    ],
  },
];

/** Evita ca /dashboard sa apara "activ" si cand suntem pe /dashboard/harta -
 * la fel pentru /venituri-cheltuieli, care e prefix pentru Dashboard/Harta/
 * Cheltuieli (toate rute proprii, nu sub-pagini ale Venituri). */
function isNavItemActive(pathname: string, href: string): boolean {
  if (
    href === "/dashboard" ||
    href === "/creante" ||
    href === "/obligatii" ||
    href === "/venituri-cheltuieli" ||
    href === "/rapoarte" ||
    href === "/management"
  ) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

function findActiveGroupId(pathname: string, groups: NavGroup[]): string | null {
  return groups.find((g) => g.items.some((i) => isNavItemActive(pathname, i.href)))?.id ?? null;
}

export function Sidebar({
  userName,
  isAdmin = false,
  moduleAccess = ["crm"],
  submoduleAccess = [],
  deployVersion = null,
}: {
  userName: string;
  isAdmin?: boolean;
  moduleAccess?: string[];
  submoduleAccess?: string[];
  deployVersion?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSheetGroupId, setMobileSheetGroupId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  function itemVisible(group: NavGroup, item: NavItem): boolean {
    if (isAdmin || moduleAccess.includes(group.moduleKey)) return true;
    if (!item.submodule) return false;
    return submoduleAccess.includes(`${group.moduleKey}.${item.submodule}`);
  }

  // Un grup e vizibil daca are acces la modulul intreg SAU la macar un
  // submodul din el (itemii fara acces raman ascunsi individual mai jos).
  const visibleGroups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => itemVisible(g, i)) })).filter(
    (g) => isAdmin || moduleAccess.includes(g.moduleKey) || g.items.length > 0
  );
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
      {/* Header mobil (sub lg) - logo + utilizator + logout, navigarea e in bottom bar.
          Pragul e lg (1024px), nu md (768px) - multe telefoane mari, culcate,
          trec de 768px latime si "sareau" gresit pe layout-ul de desktop. */}
      <header className="flex items-center justify-between border-b border-border-subtle bg-surface-1 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/icon-192.png"
            alt="NovaSales"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <p className="font-heading text-sm text-text-primary">NovaSales</p>
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
            className="rounded-md p-1.5 text-text-secondary transition hover:bg-surface-1 hover:text-text-primary"
          >
            <User size={16} />
          </Link>
          <button
            onClick={handleLogout}
            title="Deconectare"
            className="rounded-md p-1.5 text-text-secondary transition hover:bg-surface-1 hover:text-text-primary"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="Deschide meniul"
          className="fixed left-2 top-3 z-40 hidden rounded-md border border-border-subtle bg-surface-1 p-2 text-text-secondary shadow-lg transition hover:text-text-primary lg:block"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* Sidebar desktop/tableta (lg+) - 3 grupe mari, fiecare expandabila.
          Se poate restrange complet (butonul din antet) - util pe tablete
          in landscape sau daca vrei mai mult spatiu pentru continut. */}
      <aside
        className={`hidden h-screen flex-col border-r border-border-subtle bg-surface-1 py-4 transition-all duration-200 lg:flex ${
          collapsed ? "w-0 overflow-hidden px-0" : "w-60 px-3"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <Image
              src="/icon-192.png"
              alt="NovaSales"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <div>
              <p className="font-heading text-sm leading-tight text-text-primary">NovaSales</p>
              <p className="text-[11px] leading-tight text-text-muted">Novasoft CRM</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            title="Restrange meniul"
            className="shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
          >
            <PanelLeftClose size={16} />
          </button>
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
                      ? "text-[#E8007A] font-medium"
                      : "text-text-secondary hover:bg-[#E8007A]/10 hover:text-[#E8007A]"
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
                  <div className="ml-2 space-y-0.5 border-l border-border-subtle pl-3">
                    {group.items.map((item) => {
                      const isActive = isNavItemActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                            isActive
                              ? "bg-surface-2 text-text-primary font-medium"
                              : "text-text-secondary hover:bg-[#E8007A]/10 hover:text-[#E8007A]"
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

        <div className="relative border-t border-border-subtle pt-3">
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-border-subtle bg-surface-2 p-1 shadow-xl">
              <Link
                href="/profil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
              >
                <User size={15} />
                Profilul meu
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/setari/utilizatori"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Users size={15} />
                    Utilizatori
                  </Link>
                  <Link
                    href="/setari/integrari"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Plug size={15} />
                    Integrari
                  </Link>
                  <Link
                    href="/setari/comercial"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Target size={15} />
                    Comercial
                  </Link>
                  <Link
                    href="/setari/angajati"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Users size={15} />
                    Angajati
                  </Link>
                  <Link
                    href="/setari/nomenclatoare"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Settings size={15} />
                    Nomenclatoare
                  </Link>
                  <Link
                    href="/setari/consum-ai"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-primary transition hover:bg-surface-1 hover:text-text-primary"
                  >
                    <Sparkles size={15} />
                    Consum AI
                  </Link>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-surface-1">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-text-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
              <p className="flex-1 truncate text-sm text-text-primary">{userName}</p>
            </button>
            <button
              onClick={handleLogout}
              title="Deconectare"
              className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
            >
              <LogOut size={15} />
            </button>
          </div>
          {deployVersion && (
            <p className="mt-1 px-2 text-[10px] text-text-faint">Versiunea {deployVersion}</p>
          )}
          <p className="px-2 text-[10px] text-text-faint">Creat de Adrian Boncica</p>
        </div>
      </aside>

      {/* Bottom nav mobil (sub md) - 3 categorii mari; tap deschide submeniul categoriei */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-subtle bg-surface-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isActive = group.id === activeGroupId;
          return (
            <button
              key={group.id}
              onClick={() => setMobileSheetGroupId(group.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                isActive ? "text-[#E8007A]" : "text-text-secondary"
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
          className="fixed inset-0 z-40 flex items-end bg-black/60 lg:hidden"
          onClick={() => setMobileSheetGroupId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl border-t border-border-subtle bg-surface-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <mobileSheetGroup.icon size={17} />
                {mobileSheetGroup.label}
              </p>
              <button
                onClick={() => setMobileSheetGroupId(null)}
                className="rounded-md p-1 text-text-muted hover:text-text-primary"
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
                        ? "bg-surface-2 text-text-primary font-medium"
                        : "text-text-primary hover:bg-[#E8007A]/10 hover:text-[#E8007A]"
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
