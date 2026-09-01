import { getAngajatCurent, getConcediiCereri, getAngajatiList } from "@/lib/data/concedii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { AprobareClient } from "@/components/concedii/AprobareClient";

export default async function AprobarePage() {
  const { isAdmin, role } = await requireModuleAccess("concedii", "aprobare");
  const poateVedeaTot = isAdmin || role === "editor";

  const [angajatCurent, toateCererile, angajati] = await Promise.all([
    getAngajatCurent(),
    getConcediiCereri(),
    getAngajatiList(),
  ]);

  if (!angajatCurent && !poateVedeaTot) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
        Contul tau nu este asociat niciunui angajat din registru.
      </div>
    );
  }

  // Admin/editor vede toate cererile in asteptare; un manager obisnuit,
  // doar ale subalternilor lui directi.
  const subalterni = poateVedeaTot
    ? angajati.map((a) => a.id)
    : angajati.filter((a) => a.manager_id === angajatCurent?.id).map((a) => a.id);

  const cereriDeAprobat = toateCererile
    .filter((c) => c.status === "in_asteptare" && subalterni.includes(c.angajat_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const istoricRaspunsuri = toateCererile
    .filter((c) => c.status !== "in_asteptare" && subalterni.includes(c.angajat_id) && c.aprobat_de)
    .sort((a, b) => (b.data_aprobare ?? "").localeCompare(a.data_aprobare ?? ""))
    .slice(0, 20);

  return (
    <AprobareClient
      cereriDeAprobat={cereriDeAprobat}
      istoricRaspunsuri={istoricRaspunsuri}
      angajati={angajati}
    />
  );
}
