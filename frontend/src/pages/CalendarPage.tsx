import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCycles } from "../hooks/useCycles";
import type { DailyLog } from "../lib/types";
import { getDailyLogsByCycle } from "../services/dailyLogService";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Calendar } from "../components/calendar/Calendar";
import { CycleForm } from "../components/cycle/CycleForm";
import { DailyLogForm } from "../components/symptoms/DailyLogForm";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { cycles, loading, error, refetch } = useCycles();
  const [showForm, setShowForm] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate, setLogDate] = useState<string>("");
  const [logCycleId, setLogCycleId] = useState<string>("");
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  const editingCycle = editingCycleId
    ? cycles.find((c) => c.id === editingCycleId)
    : null;

  const handleNewCycle = useCallback(() => {
    setEditingCycleId(null);
    setShowForm(true);
  }, []);

  const handleEditCycle = useCallback((cycleId: string) => {
    setEditingCycleId(cycleId);
    setShowForm(true);
  }, []);

  const handleRegisterDay = useCallback(
    async (date: string, cycleId: string) => {
      const logs = await getDailyLogsByCycle(cycleId);
      const existing = logs.find((l: DailyLog) => l.date === date) ?? null;
      setEditingLog(existing);
      setLogDate(date);
      setLogCycleId(cycleId);
      setShowLogForm(true);
    },
    [],
  );

  const handleViewHistory = useCallback(
    (cycleId: string) => {
      navigate(`/history/${cycleId}`);
    },
    [navigate],
  );

  const handleCycleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
    refetch();
  }, [refetch]);

  const handleCycleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
  }, []);

  const handleLogFormSuccess = useCallback(() => {
    setShowLogForm(false);
    setEditingLog(null);
    refetch();
  }, [refetch]);

  const handleLogFormCancel = useCallback(() => {
    setShowLogForm(false);
    setEditingLog(null);
  }, []);

  if (showLogForm) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            Mi Calendario
          </h1>
        </div>
        <DailyLogForm
          cycleId={logCycleId}
          date={logDate}
          initialData={editingLog}
          onSuccess={handleLogFormSuccess}
          onCancel={handleLogFormCancel}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Mi Calendario
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Visualiza tu ciclo actual y el historial de ciclos anteriores.
          </p>
        </div>
        {!loading && !showForm && (
          <Button onClick={handleNewCycle} className="shrink-0">
            Nuevo ciclo
          </Button>
        )}
      </div>

      {error && (
        <Card padding="md" className="mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {loading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
          </div>
        </Card>
      ) : showForm ? (
        <CycleForm
          initialData={
            editingCycle
              ? {
                  id: editingCycle.id,
                  start_date: editingCycle.start_date,
                  end_date: editingCycle.end_date,
                }
              : undefined
          }
          onSuccess={handleCycleFormSuccess}
          onCancel={handleCycleFormCancel}
        />
      ) : (
        <Card padding="sm">
          <Calendar
            cycles={cycles}
            onEditCycle={handleEditCycle}
            onRegisterDay={handleRegisterDay}
            onViewHistory={handleViewHistory}
          />
        </Card>
      )}
    </div>
  );
}
