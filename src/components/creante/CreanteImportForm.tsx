"use client";

import { useState, useRef, useTransition } from "react";
import { Upload } from "lucide-react";
import { importCreanteAction } from "@/lib/actions/creante";

export function CreanteImportForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await importCreanteAction(formData);
      if (result.success && result.data) {
        setMessage({
          type: "success",
          text: `${result.data.noi} facturi noi, ${result.data.actualizate} actualizate.`,
        });
      } else {
        setMessage({ type: "error", text: result.message ?? "Eroare la import." });
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]">
        <Upload size={14} />
        {isPending ? "Se importa..." : "Importa Excel"}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={isPending}
          className="hidden"
        />
      </label>
      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
