export function PhaseLegend() {
  return (
    <div className="p-6 bg-surface-variant/30 rounded-2xl flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-menstrual-pink border border-primary/20" />
        <span className="text-label-md text-on-surface-variant">Menstruación</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-follicular-green border border-tertiary/20" />
        <span className="text-label-md text-on-surface-variant">Folicular</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-ovulation-purple border border-secondary/20" />
        <span className="text-label-md text-on-surface-variant">Ovulación</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-luteal-yellow border border-warning-orange/20" />
        <span className="text-label-md text-on-surface-variant">Lútea</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-dotted" />
        <span className="text-label-md text-on-surface-variant">Predicción</span>
      </div>
    </div>
  );
}
