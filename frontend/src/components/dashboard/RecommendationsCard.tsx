import type { CyclePhase } from "../../lib/types";
import { getArticlesByPhase } from "../../lib/cycleEducation";

const phaseCategory: Record<CyclePhase, { nutrition: string; exercise: string }> = {
  menstruacion: {
    nutrition: "Alimentos ricos en hierro y magnesio para esta fase",
    exercise: "Yoga suave y estiramientos para reducir molestias",
  },
  folicular: {
    nutrition: "Mejores alimentos para la fase folicular",
    exercise: "Yoga para aumentar tu energía",
  },
  ovulacion: {
    nutrition: "Nutrición para potenciar tu fertilidad",
    exercise: "Ejercicios de alta intensidad para la ovulación",
  },
  lutea: {
    nutrition: "Snacks que ayudan con los antojos premenstruales",
    exercise: "Caminatas ligeras para el bienestar en fase lútea",
  },
};

interface RecommendationsCardProps {
  phase: CyclePhase | null;
}

export function RecommendationsCard({ phase }: RecommendationsCardProps) {
  const config = phase ? phaseCategory[phase] : null;
  const articles = phase ? getArticlesByPhase(phase).slice(0, 2) : [];

  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-5 bg-menstrual-pink rounded-3xl p-8 border border-border-subtle flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <h5 className="text-headline-sm mb-6">Recomendado para ti</h5>

      {config ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 p-4 bg-white rounded-2xl border border-border-subtle hover:border-primary/20 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-xl bg-follicular-green/50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary">restaurant</span>
            </div>
            <div>
              <p className="text-label-md text-success-green font-bold uppercase">Nutrición</p>
              <p className="text-body-md font-semibold text-text-main group-hover:text-primary leading-snug">
                {config.nutrition}
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white rounded-2xl border border-border-subtle hover:border-secondary/20 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-xl bg-ovulation-purple/50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary">exercise</span>
            </div>
            <div>
              <p className="text-label-md text-secondary font-bold uppercase">Ejercicio</p>
              <p className="text-body-md font-semibold text-text-main group-hover:text-secondary leading-snug">
                {config.exercise}
              </p>
            </div>
          </div>

          {articles.length > 0 && articles.map((article) => (
            <div key={article.title} className="flex gap-4 p-4 bg-white rounded-2xl border border-border-subtle hover:border-primary/20 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">auto_stories</span>
              </div>
              <div>
                <p className="text-label-md text-primary font-bold uppercase">Educación</p>
                <p className="text-body-md font-semibold text-text-main group-hover:text-primary leading-snug line-clamp-2">
                  {article.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-text-muted text-center py-8">
          Registra tu ciclo para recibir recomendaciones personalizadas.
        </p>
      )}

      <button className="mt-auto text-primary font-bold text-label-md flex items-center gap-2 hover:translate-x-1 transition-transform pt-6">
        Ver todos los recursos
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </button>
    </div>
  );
}
