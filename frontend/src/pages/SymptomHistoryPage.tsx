import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCycles } from "../hooks/useCycles";
import { useDailyLogs } from "../hooks/useDailyLogs";
import { SymptomHistory } from "../components/history/SymptomHistory";

export default function SymptomHistoryPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { cycles, loading: cyclesLoading } = useCycles();
  const { logs, loading: logsLoading, error: logsError } = useDailyLogs(cycleId ?? "");

  const sortedCycles = useMemo(() => {
    return [...cycles].sort(
      (a, b) =>
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
    );
  }, [cycles]);

  const currentIndex = sortedCycles.findIndex((c) => c.id === cycleId);
  const cycle = currentIndex !== -1 ? sortedCycles[currentIndex] : null;
  const hasPrev = currentIndex < sortedCycles.length - 1;
  const hasNext = currentIndex > 0;

  const handlePrevCycle = () => {
    if (hasPrev) {
      navigate(`/history/${sortedCycles[currentIndex + 1].id}`);
    }
  };

  const handleNextCycle = () => {
    if (hasNext) {
      navigate(`/history/${sortedCycles[currentIndex - 1].id}`);
    }
  };

  const handleRegisterDay = () => {
    navigate(`/calendar`);
  };

  const handleBack = () => {
    navigate("/calendar");
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <SymptomHistory
        cycle={cycle}
        logs={logs}
        loading={cyclesLoading || logsLoading}
        error={logsError}
        onPrevCycle={handlePrevCycle}
        onNextCycle={handleNextCycle}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onRegisterDay={handleRegisterDay}
        onBack={handleBack}
      />
    </div>
  );
}
