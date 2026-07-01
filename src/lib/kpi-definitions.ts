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
};
