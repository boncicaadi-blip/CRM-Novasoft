import { TrendingUp } from "lucide-react";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";

export default async function VenituriCheltuieliPage() {
  await requireModuleAccess("venituri_cheltuieli");

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <TrendingUp size={24} className="text-slate-500" />
      </div>
      <h1 className="mb-1 text-lg font-heading text-white">Venituri & Cheltuieli</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Acest modul e in constructie. Va aduna bugetul de venituri, cheltuielile companiei si
        P&amp;L-ul estimat, dupa modelul din rapoartele Power BI existente.
      </p>
    </div>
  );
}
