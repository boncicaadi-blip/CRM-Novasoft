import { getAngajatCurent, getConcediiCereri, getConcediiSold, getAngajatiList, marcheazaCererileVazute } from "@/lib/data/concedii";
import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { primulAnCuDate } from "@/lib/concedii-analytics";
import { CererileMeleClient } from "@/components/concedii/CererileMeleClient";

export default async function CererileMelePage({
  searchParams,
}: {
  searchParams: Promise<{ angajat?: string }>;
}) {
  const { isAdmin, role } = await requireModuleAccess("concedii", "cererile_mele");
  const poateVedeaAlteCereri = isAdmin || role === "editor";
  const { angajat: angajatIdQuery } = await searchParams;

  const [angajatCurent, toateCererile, toateSolduri, angajati] = await Promise.all([
    getAngajatCurent(),
    getConcediiCereri(),
    getConcediiSold(),
    getAngajatiList(),
  ]);

  // Un admin poate vedea cererile oricarui angajat (ex. venind dintr-un
  // click din Raportul de Management) - altfel, doar ale angajatului legat
  // de contul propriu.
  const angajatDeAfisat =
    poateVedeaAlteCereri && angajatIdQuery ? (angajati.find((a) => a.id === angajatIdQuery) ?? angajatCurent) : angajatCurent;

  if (!angajatDeAfisat) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
        Contul tau nu este inca asociat niciunui angajat din registru. Cere administratorului sa te lege de un
        angajat in Concedii → Registru angajati.
      </div>
    );
  }

  const cererileAngajatului = toateCererile.filter((c) => c.angajat_id === angajatDeAfisat.id);
  const manager = angajati.find((a) => a.id === angajatDeAfisat.manager_id);
  const anInceput = primulAnCuDate(toateCererile, toateSolduri);

  if (angajatDeAfisat.id === angajatCurent?.id) {
    await marcheazaCererileVazute(angajatDeAfisat.id);
  }

  return (
    <CererileMeleClient
      angajat={angajatDeAfisat}
      manager={manager ?? null}
      cereri={cererileAngajatului}
      toateCererileAnul={toateCererile}
      toateSolduri={toateSolduri}
      anInceput={anInceput}
      vizualizareAdmin={poateVedeaAlteCereri && angajatDeAfisat.id !== angajatCurent?.id}
    />
  );
}
