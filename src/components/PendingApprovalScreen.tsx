import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";

export function PendingApprovalScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-surface-0 px-4 text-center">
      <Image
        src="/icon-192.png"
        alt="NovaSales"
        width={56}
        height={56}
        className="mb-6 rounded-2xl"
      />
      <h1 className="mb-2 text-xl font-heading text-text-primary">Cont in asteptare</h1>
      <p className="mb-6 max-w-sm text-sm text-text-secondary">
        Adresa ta de email a fost confirmata, dar contul tau nu a fost inca aprobat de un
        administrator. Vei avea acces la aplicatie imediat ce cineva din echipa Novasoft iti
        activeaza contul.
      </p>
      <LogoutButton />
    </div>
  );
}
