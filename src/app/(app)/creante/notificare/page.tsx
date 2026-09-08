import { requireModuleAccess } from "@/lib/auth/moduleAccess";
import { getGrupuriCuSoldAction } from "@/lib/actions/notificare-plata";
import { NotificarePlataClient } from "@/components/creante/NotificarePlataClient";

export default async function NotificarePlataPage() {
  await requireModuleAccess("creante_obligatii", "creante_dashboard");

  const grupuri = await getGrupuriCuSoldAction();

  return <NotificarePlataClient grupuri={grupuri} />;
}
