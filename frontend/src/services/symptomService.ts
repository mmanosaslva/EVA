export interface SymptomCatalogItem {
  id: number;
  name: string;
  category: "fisica" | "emocional" | "digestiva";
}

const MOCK_SYMPTOMS: SymptomCatalogItem[] = [
  { id: 1, name: "Dolor abdominal", category: "fisica" },
  { id: 2, name: "Dolor de cabeza", category: "fisica" },
  { id: 3, name: "Fatiga", category: "fisica" },
  { id: 4, name: "Hinchazón", category: "digestiva" },
  { id: 5, name: "Náuseas", category: "digestiva" },
  { id: 6, name: "Irritabilidad", category: "emocional" },
  { id: 7, name: "Ansiedad", category: "emocional" },
  { id: 8, name: "Tristeza", category: "emocional" },
  { id: 9, name: "Antojos", category: "digestiva" },
  { id: 10, name: "Acné", category: "fisica" },
  { id: 11, name: "Sensibilidad mamaria", category: "fisica" },
  { id: 12, name: "Insomnio", category: "fisica" },
  { id: 13, name: "Energía alta", category: "fisica" },
  { id: 14, name: "Dolor lumbar", category: "fisica" },
  { id: 15, name: "Problemas de concentración", category: "emocional" },
];

export async function getSymptomCatalog(): Promise<SymptomCatalogItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return MOCK_SYMPTOMS;
}
