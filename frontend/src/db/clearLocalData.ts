import db from "./database";
import { invalidateCycleCache } from "../services/cycleService";
import { invalidateSymptomCaches } from "../services/symptomService";

/**
 * Borra todo lo que EVA guarda en este dispositivo: IndexedDB, cachés en
 * memoria y respuestas de la API en Cache Storage. Se llama al cerrar sesión
 * y al borrar la cuenta (Docs/s10/restricciones.md RX-08).
 */
export async function clearLocalData(): Promise<void> {
  invalidateCycleCache();
  invalidateSymptomCaches();

  try {
    await Promise.all(db.tables.map((table) => table.clear()));
  } catch {
    // IndexedDB no disponible (navegación privada, etc.): no hay nada que borrar
  }

  if (typeof caches !== "undefined") {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.includes("api")).map((n) => caches.delete(n)));
    } catch {
      // Cache Storage no disponible
    }
  }
}
