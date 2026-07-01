import { create } from "zustand";
import type { SymptomCatalogItem } from "../services/symptomService";
import { getSymptomCatalog } from "../services/symptomService";

interface SymptomStore {
  symptoms: SymptomCatalogItem[];
  isLoaded: boolean;
  isLoading: boolean;
  loadSymptoms: () => Promise<void>;
}

export const useSymptomStore = create<SymptomStore>((set, get) => ({
  symptoms: [],
  isLoaded: false,
  isLoading: false,

  loadSymptoms: async () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true });
    try {
      const data = await getSymptomCatalog();
      set({ symptoms: data, isLoaded: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
