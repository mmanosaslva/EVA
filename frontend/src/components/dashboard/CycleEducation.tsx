import { useState } from "react";
import type { CyclePhase } from "../../lib/types";
import {
  getArticlesByPhase,
  getAllPhases,
  PHASE_ICONS,
  PHASE_TITLES,
} from "../../lib/cycleEducation";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface CycleEducationProps {
  currentPhase: CyclePhase | null;
}

function ArticleCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-lavender-200">
      <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
      <p className="text-xs text-text-secondary leading-relaxed">{content}</p>
    </div>
  );
}

function PhaseSection({
  phase,
  expanded,
  onToggle,
}: {
  phase: CyclePhase;
  expanded: boolean;
  onToggle: () => void;
}) {
  const articles = getArticlesByPhase(phase);

  if (articles.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        <span
          className="text-sm transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className="text-base" aria-hidden="true">
          {PHASE_ICONS[phase]}
        </span>
        <span className="text-sm font-medium text-text-primary">
          {PHASE_TITLES[phase]}
        </span>
        <Badge variant="default" className="ml-1">
          {articles.length}
        </Badge>
      </button>

      {expanded && (
        <div className="ml-7 space-y-2 pb-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.title}
              title={article.title}
              content={article.content}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card padding="md">
      <div className="flex flex-col items-center text-center py-4">
        <span className="text-2xl mb-2">📚</span>
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Educación por fase del ciclo
        </h3>
        <p className="text-xs text-text-secondary">
          Registrá tu primer ciclo para recibir artículos personalizados según
          la fase en la que te encontrás.
        </p>
      </div>
    </Card>
  );
}

export function CycleEducation({ currentPhase }: CycleEducationProps) {
  const allPhases = getAllPhases();
  const [expandedPhase, setExpandedPhase] = useState<CyclePhase | null>(
    currentPhase,
  );

  if (!currentPhase) return <EmptyState />;

  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">
          📚
        </span>
        <h3 className="text-sm font-semibold text-text-primary">
          Aprendé sobre tu ciclo
        </h3>
      </div>

      <div>
        {allPhases.map((phase) => {
          const isCurrent = phase === currentPhase;
          const isExpanded = expandedPhase === phase;

          return (
            <div
              key={phase}
              className={`rounded-lg ${
                isCurrent && !isExpanded
                  ? "border border-lavender-200 bg-lavender-50/50"
                  : ""
              } ${isCurrent && isExpanded ? "border border-lavender-200 bg-lavender-50/30 -mx-2 px-2 rounded-lg" : ""}`}
            >
              <PhaseSection
                phase={phase}
                expanded={isExpanded}
                onToggle={() =>
                  setExpandedPhase(isExpanded ? null : phase)
                }
              />

              {isCurrent && !isExpanded && (
                <p className="ml-7 pb-3 text-[11px] text-lavender-600">
                  Tu fase actual — expandí para ver los artículos
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
