export interface InsightMessage {
  id: string;
  role: "user" | "eva";
  content: string;
  timestamp: string;
}

export interface InsightResponse {
  insight: string;
  source: string;
  disclaimer: string;
}

const MOCK_HISTORY: InsightMessage[] = [
  {
    id: "h1",
    role: "eva",
    content:
      "¡Hola! Soy EVA, tu asistente de salud menstrual. Podés preguntarme sobre tu ciclo, síntomas, fases o cualquier duda que tengas. Recordá que no reemplazo a tu ginecóloga.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

function generateMockResponse(question: string): InsightResponse {
  const q = question.toLowerCase();

  if (q.includes("dolor") || q.includes("cólico") || q.includes("crampeo")) {
    return {
      insight:
        "El dolor abdominal durante la menstruación es común. Aplicar calor local, mantenerse hidratada y realizar caminatas suaves puede ayudar a reducir los cólicos. Si el dolor es muy intenso, consultá con tu ginecóloga.",
      source: "mock/offline",
      disclaimer: "EVA no reemplaza el consejo médico profesional.",
    };
  }

  if (q.includes("cansada") || q.includes("fatiga") || q.includes("cansancio")) {
    return {
      insight:
        "La fatiga es una señal de tu cuerpo pidiendo descanso. En fase lútea los niveles de progesterona aumentan y es normal sentirse con menos energía. Priorizá el sueño, reducí la intensidad del ejercicio y mantené una alimentación balanceada.",
      source: "mock/offline",
      disclaimer: "EVA no reemplaza el consejo médico profesional.",
    };
  }

  if (q.includes("fase") || q.includes("etapa")) {
    return {
      insight:
        "Tu ciclo tiene 4 fases: menstruación, folicular, ovulación y lútea. Cada una trae cambios hormonales distintos. Podés ver tu fase actual en el dashboard de EVA.",
      source: "mock/offline",
      disclaimer: "EVA no reemplaza el consejo médico profesional.",
    };
  }

  if (q.includes("síntoma") || q.includes("sintoma") || q.includes("normal")) {
    return {
      insight:
        "Muchos síntomas como cambios de humor, sensibilidad en los senos o hinchazón son normales durante el ciclo. Llevar un registro diario en EVA te ayuda a identificar tus patrones personales y anticiparte a ellos.",
      source: "mock/offline",
      disclaimer: "EVA no reemplaza el consejo médico profesional.",
    };
  }

  if (q.includes("alimentación") || q.includes("comer") || q.includes("comida")) {
    return {
      insight:
        "Una dieta rica en hierro, magnesio y omega-3 puede ayudarte durante el ciclo. Lentejas, espinaca, chocolate negro (+70%), salmón y nueces son excelentes aliados en cada fase.",
      source: "mock/offline",
      disclaimer: "EVA no reemplaza el consejo médico profesional.",
    };
  }

  return {
    insight:
      "Gracias por tu consulta. Te recomiendo seguir registrando tus síntomas en EVA para entender mejor tus patrones. Recordá que EVA no reemplaza a tu ginecóloga.",
    source: "mock/offline",
    disclaimer: "EVA no reemplaza el consejo médico profesional.",
  };
}

export async function getInsightsHistory(): Promise<InsightMessage[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_HISTORY;
}

export async function postInsight(question: string): Promise<InsightResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return generateMockResponse(question);
}
