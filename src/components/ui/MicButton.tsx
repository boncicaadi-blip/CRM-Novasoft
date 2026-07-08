"use client";

import { useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";

// Web Speech API nu are tipuri oficiale in lib.dom.d.ts - definim minimal ce
// folosim, ca sa evitam `any` peste tot.
interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Seteaza valoarea unui input/textarea prin setter-ul nativ al prototipului
 * (nu prin proprietatea instantei) si declanseaza un eveniment 'input' real -
 * singurul mod fiabil sa "pacalim" React sa observe schimbarea si sa apeleze
 * onChange, indiferent daca elementul e folosit controlat sau necontrolat.
 */
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function MicButton({
  targetRef,
  className = "",
}: {
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggle() {
    const el = targetRef.current;
    if (!el) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      alert("Recunoasterea vocala nu e suportata in acest browser. Incearca Chrome.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "ro-RO";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      if (!transcript) return;
      const current = el.value;
      const separator = current && !current.endsWith(" ") ? " " : "";
      setNativeValue(el, current + separator + transcript);
      el.focus();
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Se asculta... (click pentru stop)" : "Dicteaza"}
      className={`flex items-center justify-center rounded-md p-1.5 transition ${
        listening ? "bg-red-500/20 text-red-400" : "text-text-muted hover:bg-surface-2 hover:text-text-primary"
      } ${className}`}
    >
      {listening ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
    </button>
  );
}
