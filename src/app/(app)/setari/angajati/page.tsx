import { getAngajatiLunar } from "@/lib/data/angajati";
import { AngajatiForm } from "@/components/setari/AngajatiForm";

export default async function SetariAngajatiPage() {
  const rows = await getAngajatiLunar();

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="text-lg font-heading text-white">Angajati</h1>
      <p className="mb-5 text-sm text-slate-500">
        Numarul de angajati, pe luna - folosit pentru productivitate si cost per angajat in Management.
      </p>
      <AngajatiForm rows={rows} />
    </div>
  );
}
