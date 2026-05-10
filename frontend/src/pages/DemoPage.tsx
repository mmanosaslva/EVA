import { Button, Input, Card, Badge } from "../components/ui";

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">EVA — Design System</h1>
        <p className="mt-1 text-text-secondary">Componentes base del sistema de diseño.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-primary">Botones</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-primary">Inputs</h2>
        <div className="flex flex-col gap-4 max-w-sm">
          <Input label="Email" placeholder="tu@email.com" />
          <Input label="Contraseña" type="password" placeholder="••••••••" />
          <Input label="Nombre" error="Este campo es obligatorio" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-primary">Cards</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card padding="md">
            <h3 className="font-medium text-text-primary">Tu ciclo</h3>
            <p className="mt-1 text-sm text-text-secondary">Día 12 de 28 · Fase folicular</p>
          </Card>
          <Card padding="md">
            <h3 className="font-medium text-text-primary">Próximo período</h3>
            <p className="mt-1 text-sm text-text-secondary">Estimado en 16 días</p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-text-primary">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="menstruacion">Menstruación</Badge>
          <Badge variant="folicular">Folicular</Badge>
          <Badge variant="ovulacion">Ovulación</Badge>
          <Badge variant="lutea">Lútea</Badge>
          <Badge variant="default">Predicción básica</Badge>
        </div>
      </section>
    </main>
  );
}