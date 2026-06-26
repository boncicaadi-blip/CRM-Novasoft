import { getAllNomenclatoare } from "@/lib/data/nomenclatoare";
import { NomenclatoareAdmin } from "@/components/admin/NomenclatoareAdmin";

export default async function NomenclatoarePage() {
  const items = await getAllNomenclatoare();

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="text-lg font-heading text-white">Nomenclatoare</h1>
      <p className="mb-5 text-sm text-slate-500">
        Listele de valori folosite in formularul de oportunitati. Orice utilizator cu cont poate
        adauga, edita sau dezactiva valori — fara sa fie nevoie de modificari in cod.
      </p>
      <NomenclatoareAdmin items={items} />
    </div>
  );
}
