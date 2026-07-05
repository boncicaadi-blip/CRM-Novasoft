export interface KpiDefinition {
  /** Ce inseamna KPI-ul, pe scurt. */
  descriere: string;
  /** Formula de calcul, daca e cazul (nu toate KPI-urile au una explicita). */
  formula?: string;
  /** Cum se citeste / interpreteaza valoarea - intrebarea de business la care raspunde. */
  cumAnalizezi: string;
}

export const KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  pipelineActivSaas: {
    descriere:
      "Valoarea totala (neponderata) a oportunitatilor active in varianta SaaS: abonamente si implementare aferenta.",
    formula: "Suma ARR pentru oportunitatile active cu status Activa, mod SaaS",
    cumAnalizezi: "Cat business potential SaaS ai acum in lucru?",
  },
  pipelineActivOnprem: {
    descriere:
      "Valoarea totala (neponderata) a oportunitatilor active in varianta On-Premise: licenta si implementare aferenta.",
    formula: "Suma valoare licenta pentru oportunitatile active cu status Activa, mod On-Premise",
    cumAnalizezi: "Cat business potential On-Premise (proiecte clasice) ai acum in lucru?",
  },
  pipelineActivImplementare: {
    descriere: "Valoarea totala de implementare pentru toate oportunitatile active, indiferent de mod.",
    formula: "Suma valorii de implementare pentru oportunitatile active",
    cumAnalizezi: "Cat din pipeline vine din servicii de implementare, separat de licenta/abonament?",
  },
  pipelineTotalActiv: {
    descriere:
      "Valoarea totala a oportunitatilor active din pipeline (neinchise) - nu include castigate sau pierdute.",
    formula: "Pipeline Activ SaaS + Pipeline Activ On-Premise + Pipeline Activ Implementare",
    cumAnalizezi: "Cat business potential am acum in lucru, in total?",
  },
  pipelineCoverage: {
    descriere: "Raportul dintre pipeline-ul activ si targetul comercial.",
    formula: "Pipeline Activ / Target Comercial",
    cumAnalizezi:
      "Am suficient pipeline ca sa ating targetul? 1.0 = acoperi exact targetul, sub 1 = pipeline insuficient, peste 1 = ai buffer.",
  },
  pipelineDelta: {
    descriere: "Diferenta de valoare a pipeline-ului fata de saptamana anterioara.",
    formula: "Pipeline Total Activ (acum) - Pipeline Total Activ (acum o saptamana)",
    cumAnalizezi: "Pipeline-ul creste sau scade de la o saptamana la alta?",
  },
  pipelineDeltaProcent: {
    descriere: "Variatia procentuala a pipeline-ului fata de saptamana anterioara.",
    formula: "(Pipeline curent - Pipeline anterior) / Pipeline anterior",
    cumAnalizezi: "Cu cat la suta creste sau scade pipeline-ul saptamanal?",
  },
  forecastTotal: {
    descriere: "Valoarea estimata a pipeline-ului, ponderata cu probabilitatea fiecarei oportunitati.",
    formula: "Suma (Valoare oportunitate x Probabilitate)",
    cumAnalizezi: "Cat business este realist sa inchid, tinand cont de sansele reale ale fiecarei oportunitati?",
  },
  forecastSaas: {
    descriere: "Forecast-ul ponderat, doar pentru oportunitatile in varianta SaaS (abonamente + implementare).",
    cumAnalizezi: "Cat din forecast-ul realist vine din SaaS?",
  },
  forecastOnprem: {
    descriere: "Forecast-ul ponderat, doar pentru oportunitatile in varianta On-Premise (licenta + implementare).",
    cumAnalizezi: "Cat din forecast-ul realist vine din proiecte clasice On-Premise?",
  },
  forecastDelta: {
    descriere: "Diferenta de forecast fata de saptamana anterioara.",
    formula: "Forecast Total (acum) - Forecast Total (acum o saptamana)",
    cumAnalizezi: "Forecast-ul se imbunatateste sau se deterioreaza?",
  },
  forecastDeltaProcent: {
    descriere: "Variatia procentuala a forecast-ului fata de saptamana anterioara.",
    formula: "(Forecast curent - Forecast anterior) / Forecast anterior",
    cumAnalizezi: "Cu cat la suta se schimba forecast-ul saptamanal?",
  },
  oportunitatiActive: {
    descriere: "Numarul de oportunitati active din pipeline (status Activa, exclus Lead Pool).",
    cumAnalizezi: "Cate deal-uri ai in lucru chiar acum?",
  },
  winRate: {
    descriere: "Rata de conversie a oportunitatilor inchise in vanzari castigate.",
    formula: "Oportunitati castigate / (castigate + pierdute)",
    cumAnalizezi: "Cat de eficient converteste echipa pipeline-ul in vanzari reale?",
  },
  crmArrActiv: {
    descriere: "Valoarea anuala recurenta (ARR) a tuturor oportunitatilor active, neponderata cu probabilitatea.",
    formula: "Suma ARR pentru oportunitatile cu status Activa (exclus Lead Pool)",
    cumAnalizezi: "Cat business recurent potential ai in lucru chiar acum?",
  },
  crmForecastPonderat: {
    descriere: "ARR-ul pipeline-ului, ajustat cu probabilitatea de castig a fiecarei oportunitati (dupa stage).",
    formula: "Suma (ARR x Probabilitate stage), pentru oportunitatile active",
    cumAnalizezi: "O estimare mai realista decat ARR brut - cat ai castiga probabil, nu tot ce ai in pipeline.",
  },
  crmForecastImplementare: {
    descriere: "Valoarea estimata din implementari, ajustata cu probabilitatea de castig.",
    formula: "Suma (Valoare implementare x Probabilitate stage), pentru oportunitatile active",
    cumAnalizezi: "Cat venit din implementare (nerecurent) estimezi sa incasezi din pipeline-ul curent?",
  },
  crmCastigate: {
    descriere: "Numarul de oportunitati marcate castigate (Client), din tot istoricul urmarit.",
    cumAnalizezi: "Impreuna cu win rate-ul, arata cat de bine converteste pipeline-ul in clienti reali.",
  },
  crmPierdute: {
    descriere: "Numarul de oportunitati marcate pierdute, din tot istoricul urmarit.",
    cumAnalizezi: "Un numar mare de pierderi, comparat cu castigurile, poate semnala o problema de calificare sau de oferta.",
  },
  crmFaraNextStep: {
    descriere: "Oportunitati active care nu au o urmatoare actiune programata - risca sa stagneze fara ca nimeni sa observe.",
    cumAnalizezi: "Cu cat numarul e mai mare, cu atat mai mult pipeline scapa de sub control operational. Click pentru lista completa.",
  },
  crmStageChart: {
    descriere: "Numarul si valoarea oportunitatilor active, grupate pe stage-ul curent din pipeline.",
    formula: "Numarare + suma ARR, grupate dupa Stage (exclus Lead Pool)",
    cumAnalizezi: "Unde se aglomereaza pipeline-ul? Un stage cu multe oportunitati blocate poate semnala o problema de proces.",
  },
  crmStatusChart: {
    descriere: "Distributia oportunitatilor dupa status: Activa, Castigata, Pierduta, Amanata.",
    cumAnalizezi: "O privire rapida asupra sanatatii generale a pipeline-ului.",
  },
  crmResponsabilChart: {
    descriere: "ARR-ul insumat al oportunitatilor active, grupat pe responsabilul de vanzare.",
    formula: "Suma ARR pentru oportunitatile active, grupata dupa Responsabil vanzare",
    cumAnalizezi: "Cine are cel mai mult pipeline in lucru chiar acum - util pentru distribuirea echilibrata a leadurilor.",
  },
  crmEvolutieArrChart: {
    descriere: "Evolutia ARR-ului activ in timp, pe baza istoricului de schimbari al oportunitatilor.",
    cumAnalizezi: "Arata daca pipeline-ul creste sau scade in timp - un trend descendent sustinut merita investigat.",
  },
};
