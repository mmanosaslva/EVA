export interface SymptomStat {
  symptomId: number;
  name: string;
  category: "fisica" | "emocional" | "digestiva" | "otra";
  frequency: number;
  avgIntensity: number;
  cycleCount: number;
  totalCycles: number;
}

type SymptomCategory = "fisica" | "emocional" | "digestiva" | "otra";

const CATEGORY_COLORS: Record<SymptomCategory, string> = {
  fisica: "#ef4444",
  emocional: "#8b5cf6",
  digestiva: "#10b981",
  otra: "#6b7280",
};

export { CATEGORY_COLORS };

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  fisica: "Física",
  emocional: "Emocional",
  digestiva: "Digestiva",
  otra: "Otra",
};

export { CATEGORY_LABELS };

export function getMockSymptomStats(
  totalCycles: number,
): SymptomStat[] {
  if (totalCycles < 3) return [];

  const cycleCount = Math.min(totalCycles, Math.max(3, totalCycles));

  const stats: SymptomStat[] = [
    { symptomId: 21, name: "Irritabilidad", category: "emocional", frequency: 80, avgIntensity: 3.4, cycleCount, totalCycles },
    { symptomId: 1, name: "Dolor abdominal", category: "fisica", frequency: 73, avgIntensity: 4.1, cycleCount, totalCycles },
    { symptomId: 16, name: "Hinchazón", category: "digestiva", frequency: 67, avgIntensity: 2.8, cycleCount, totalCycles },
    { symptomId: 3, name: "Fatiga", category: "fisica", frequency: 60, avgIntensity: 3.2, cycleCount, totalCycles },
    { symptomId: 23, name: "Tristeza", category: "emocional", frequency: 53, avgIntensity: 2.9, cycleCount, totalCycles },
    { symptomId: 24, name: "Cambios de humor", category: "emocional", frequency: 47, avgIntensity: 3.1, cycleCount, totalCycles },
    { symptomId: 10, name: "Calambres", category: "fisica", frequency: 40, avgIntensity: 4.3, cycleCount, totalCycles },
    { symptomId: 4, name: "Sensibilidad en senos", category: "fisica", frequency: 35, avgIntensity: 2.5, cycleCount, totalCycles },
  ];

  return stats.sort((a, b) => b.frequency - a.frequency);
}
