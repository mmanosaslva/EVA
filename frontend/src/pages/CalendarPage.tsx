import { useState, useCallback } from "react";
import { useCycles } from "../hooks/useCycles";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Calendar } from "../components/calendar/Calendar";
import { CycleForm } from "../components/cycle/CycleForm";

export default function CalendarPage() {
  const { cycles, loading, error, refetch } = useCycles();
  const [showForm, setShowForm] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

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

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
  }, []);

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
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      ) : (
        <Card padding="sm">
          <Calendar cycles={cycles} onEditCycle={handleEditCycle} />
        </Card>
      )}
    </div>
  );
}
