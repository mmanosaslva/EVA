import type { SymptomCatalogItem } from "../../services/symptomService";

interface SymptomGridProps {
  symptoms: SymptomCatalogItem[];
  selectedIds: Set<number>;
  onToggle: (s: SymptomCatalogItem) => void;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  fisica: {
    label: "Física",
    icon: "💪",
    color: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 data-[selected=true]:bg-red-200 data-[selected=true]:border-red-400",
  },
  emocional: {
    label: "Emocional",
    icon: "😔",
    color: "border-lavender-200 bg-lavender-50 text-lavender-700 hover:bg-lavender-100 data-[selected=true]:bg-lavender-200 data-[selected=true]:border-lavender-400",
  },
  digestiva: {
    label: "Digestiva",
    icon: "🌿",
    color: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 data-[selected=true]:bg-green-200 data-[selected=true]:border-green-400",
  },
};

export function SymptomGrid({
  symptoms,
  selectedIds,
  onToggle,
}: SymptomGridProps) {
  const categories = ["fisica", "emocional", "digestiva"] as const;

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat];
        const catSymptoms = symptoms.filter((s) => s.category === cat);
        if (catSymptoms.length === 0) return null;

        return (
          <div key={cat}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {meta.icon} {meta.label}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {catSymptoms.map((symptom) => (
                <button
                  key={symptom.id}
                  type="button"
                  data-selected={selectedIds.has(symptom.id)}
                  onClick={() => onToggle(symptom)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${meta.color}`}
                >
                  {symptom.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
