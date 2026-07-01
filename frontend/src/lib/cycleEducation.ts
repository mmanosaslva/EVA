import type { CyclePhase } from "./types";

export interface EducationArticle {
  phase: CyclePhase;
  title: string;
  content: string;
}

const ARTICLES: EducationArticle[] = [
  // ── Menstruación ──
  {
    phase: "menstruacion",
    title: "El descanso durante tu período",
    content:
      "Durante la menstruación tu cuerpo pierde hierro y energía. Priorizá el descanso, mantenete hidratada y consumí alimentos ricos en hierro como espinaca, lentejas y carnes magras. Escuchá a tu cuerpo: si necesitás dormir más, hacelo sin culpa.",
  },
  {
    phase: "menstruacion",
    title: "Alimentación para reducir los cólicos",
    content:
      "Los alimentos ricos en magnesio como el chocolate negro, las almendras y las bananas ayudan a relajar los músculos y reducir los cólicos. Evitá el exceso de cafeína y sal, que pueden aumentar la retención de líquidos y la inflamación.",
  },
  {
    phase: "menstruacion",
    title: "Ejercicio suave y menstruación",
    content:
      "Aunque no tengas ganas, el ejercicio ligero como caminatas, yoga suave o estiramientos libera endorfinas que actúan como analgésicos naturales. Solo 15 minutos al día pueden marcar la diferencia en tu nivel de dolor y estado de ánimo.",
  },

  // ── Folicular ──
  {
    phase: "folicular",
    title: "La energía de la fase folicular",
    content:
      "Después de tu período, los niveles de estrógeno aumentan progresivamente, lo que te da más energía y claridad mental. Es el mejor momento para iniciar proyectos nuevos, hacer ejercicio intenso y tomar decisiones importantes.",
  },
  {
    phase: "folicular",
    title: "Creatividad y claridad mental",
    content:
      "El estrógeno estimula las conexiones neuronales. Aprovechá esta fase para actividades creativas, resolver problemas complejos y aprender cosas nuevas. Tu cerebro está en su momento más plástico del ciclo.",
  },
  {
    phase: "folicular",
    title: "Nutrición para potenciar tu energía",
    content:
      "Consumí proteínas magras, vegetales verdes y grasas saludables como palta y aceite de oliva. Estos alimentos nutren los folículos ováricos y mantienen estables tus niveles de energía. Evitá los ultraprocesados que generan picos de azúcar.",
  },

  // ── Ovulación ──
  {
    phase: "ovulacion",
    title: "Entendiendo tu ventana fértil",
    content:
      "La ovulación ocurre aproximadamente 14 días antes de tu próximo período. Es el único momento del ciclo en que podés concebir. El moco cervical se vuelve transparente y elástico, similar a la clara de huevo, indicando tus días más fértiles.",
  },
  {
    phase: "ovulacion",
    title: "Comunicación en tu mejor momento",
    content:
      "Durante la ovulación la testosterona y el estrógeno están en su pico, mejorando tus habilidades de comunicación y confianza social. Es ideal para presentaciones, entrevistas y conversaciones importantes. Tu carisma natural está potenciado.",
  },
  {
    phase: "ovulacion",
    title: "Señales de tu cuerpo en ovulación",
    content:
      "Prestá atención a señales como ligero dolor abdominal en un lado, aumento del deseo sexual y cambios en el flujo vaginal. Algunas mujeres experimentan un leve incremento de temperatura basal. Todas son señales normales de un ciclo saludable.",
  },

  // ── Lútea ──
  {
    phase: "lutea",
    title: "Manejo del síndrome premenstrual",
    content:
      "La progesterona domina esta fase y puede traer síntomas como irritabilidad, hinchazón y fatiga. Reducí el consumo de azúcar y alcohol, aumentá la ingesta de magnesio y calcio, y practicá técnicas de relajación como respiración profunda.",
  },
  {
    phase: "lutea",
    title: "Antojos y alimentación consciente",
    content:
      "Es normal tener más hambre y antojos en fase lútea; tu metabolismo aumenta ligeramente. Elegí snacks saludables como frutos secos, yogur griego y chocolate negro (+70%). Evitá el ciclo de culpa: un antojo ocasional no arruina tu salud.",
  },
  {
    phase: "lutea",
    title: "Autocuidado en fase lútea",
    content:
      "Este es el momento de bajar el ritmo si tu cuerpo lo pide. Reducí la intensidad del ejercicio, priorizá el sueño y date permiso para decir que no a compromisos extras. Un baño caliente, leer un libro o meditar pueden ser tus mejores aliados.",
  },
];

const PHASE_ICONS: Record<CyclePhase, string> = {
  menstruacion: "🩸",
  folicular: "⚡",
  ovulacion: "🌸",
  lutea: "🌙",
};

const PHASE_TITLES: Record<CyclePhase, string> = {
  menstruacion: "Menstruación",
  folicular: "Folicular",
  ovulacion: "Ovulación",
  lutea: "Lútea",
};

export { PHASE_ICONS, PHASE_TITLES };

export function getArticlesByPhase(phase: CyclePhase): EducationArticle[] {
  return ARTICLES.filter((a) => a.phase === phase);
}

export function getAllPhases(): CyclePhase[] {
  return ["menstruacion", "folicular", "ovulacion", "lutea"];
}
