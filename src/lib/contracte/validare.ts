import { askClaude } from "@/lib/ai/client";

/**
 * Trimite textul unui contract deja completat catre Claude, pentru o
 * verificare finala - nu genereaza continut nou, doar citeste ce a rezultat
 * si semnaleaza ce a ramas necompletat sau ce pare inconsecvent.
 */
export async function valideazaContractCuClaude(textContract: string): Promise<string> {
  const system = `Esti un asistent care verifica contracte comerciale completate automat, inainte sa fie trimise clientului.
Nu redactezi si nu modifici continutul contractului - doar il citesti si raportezi problemele gasite.

Cauta specific:
1. Placeholder-e ramase necompletate - apar ca "___" in text. Enumera-le, cu putin context (ce informatie lipseste).
2. Inconsecvente evidente - de exemplu, o suma care apare diferit in doua locuri, un nume de client scris diferit in doua locuri, o data care nu are sens (ex. data contractului dupa data scadentei unei transe).
3. Campuri care par gresit completate (ex. un CUI cu litere, un email fara @, un numar de telefon cu prea putine cifre).

Raspunde STRICT in acest format, in romana, concis (maxim 150 de cuvinte):

CAMPURI NECOMPLETATE: [lista, sau "niciunul"]
INCONSECVENTE: [lista, sau "niciuna gasita"]
ALTE OBSERVATII: [orice altceva relevant, sau "-"]

Nu adauga nimic in afara acestui format. Nu felicita, nu introduce, nu incheia cu alte comentarii.`;

  const prompt = `Textul contractului completat (extras, fara formatare):\n\n${textContract.slice(0, 15000)}`;

  try {
    const raspuns = await askClaude({
      system,
      prompt,
      maxTokens: 700,
    });
    return raspuns;
  } catch (err) {
    console.error("valideazaContractCuClaude error:", err);
    return "Validarea automata a esuat - verifica manual contractul inainte de a-l trimite.";
  }
}
