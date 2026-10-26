# EVA — Guía de tests End-to-End (Playwright)

> **Qué es este documento:** la guía específica para escribir, correr y mantener los E2E de EVA en S10. Reemplaza los criterios E2E de `Docs/CRITERIOS_ISSUES.md` (#27, #38, #52, #55) y revierte la decisión de eliminar Playwright de `RESUMEN_DECISIONES_FASE2.md` §6.
>
> **Marco:** [`restricciones.md`](restricciones.md) RX-10 (nunca servicios reales) y [`reglas.md`](reglas.md) RG-06 y RG-13.
>
> Última revisión: 2026-10-25.

---

## 1. Propósito y alcance

Los E2E prueban **flujos de usuaria en el navegador real**, con el backend simulado. No prueban la lógica del backend: eso lo cubre pytest.

| Sí va en E2E | No va en E2E (va en pytest o Vitest) |
|---|---|
| Login, registro, verificación, logout | Validación de JWT |
| Registrar un ciclo y síntomas desde la UI | Filtros `from_date`/`to_date` del export |
| Descargar el CSV/PDF desde un botón | Contenido exacto del CSV generado |
| Chatbot: respuesta del LLM, respaldo y error | Prompt enviado a Groq, sanitización |
| Borrado de cuenta desde el modal | Cascada SQL del borrado |
| Offline: registrar sin red y sincronizar al volver | Lógica de `syncQueue` aislada |

Por eso, los tests actuales `export.spec.ts` "rechaza request sin autenticación", "filtra por from_date" y "acepta to_date" **se mueven a pytest**.

## 2. Principios

1. **Red 100 % mockeada.** La app de E2E apunta a `http://api.e2e.invalid`, un dominio que no existe. Cualquier petición sin mock **hace fallar el test**. Así es imposible tocar Neon, Groq o Brevo por accidente (RX-10).
2. **Datos sintéticos.** Fixtures inventados (`test@eva.test`), con fechas relativas a hoy. Nunca datos reales.
3. **Selectores accesibles.** `getByRole`, `getByLabel` y `getByText`, en ese orden. `data-testid` solo si no hay alternativa accesible, y se documenta por qué.
4. **Sin esperas fijas.** Prohibido `page.waitForTimeout`. Se usan las aserciones con auto-espera (`expect(...).toBeVisible()`), `waitForResponse` y `waitForEvent('download')`.
5. **Tests independientes.** Cada test arma su propio estado; no depende del orden ni de otro test.
6. **Un flujo por test.** El título describe el comportamiento en español: `"guarda el registro diario y lo muestra en el historial"`.

## 3. Arquitectura

```
npm run test:e2e
   │
   ├─ webServer: vite build --mode e2e   (lee .env.e2e → VITE_API_URL=http://api.e2e.invalid)
   │             vite preview --port 4173
   │
   └─ Chromium ──► http://localhost:4173            (app real compilada)
                    │
                    └─ fetch http://api.e2e.invalid/**  ──► page.route  ──► fixtures (mocks)
                                                         └─ sin mock ──► abort + test FALLA
```

### 3.1 Estructura de archivos

```
frontend/
├── .env.e2e                      # VITE_API_URL=http://api.e2e.invalid (sin secretos, se commitea)
├── playwright.config.ts
└── e2e/
    ├── fixtures/
    │   ├── test.ts               # `test` extendido: guardia de red + api mock + sesión
    │   ├── data.ts               # datos sintéticos (usuario, ciclos, logs, síntomas)
    │   └── api.ts                # mocks por endpoint (basado en apiMocks.ts de 8954784)
    ├── auth.spec.ts              # login, registro, verificación, logout
    ├── cycles.spec.ts            # crear y editar ciclo
    ├── symptoms.spec.ts          # #27 registro de síntomas
    ├── insights.spec.ts          # chatbot: groq / respaldo / error
    ├── export.spec.ts            # #52 descarga CSV y PDF
    ├── account.spec.ts           # borrado de cuenta
    └── offline.spec.ts           # #38 offline (fixme hasta T17)
```

La regresión completa (#55) **no es un archivo**: es la suite entera. Los tests críticos llevan la etiqueta `@smoke`.

### 3.2 `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "e2e-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    locale: "es-ES",
    timezoneId: "America/Bogota",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "block" },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], serviceWorkers: "block" },
      grep: /@smoke/,
    },
    {
      name: "offline",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
      testMatch: /offline\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npx vite build --mode e2e && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  timeout: 60_000,
});
```

- `serviceWorkers: "block"` en los proyectos normales evita que el Service Worker sirva respuestas cacheadas y esconda la falta de un mock.
- Solo el proyecto `offline` deja instalar el Service Worker.

### 3.3 Guardia de red y `test` extendido (`e2e/fixtures/test.ts`)

```ts
import { test as base, expect, type Page } from "@playwright/test";
import { mockApi, type ApiMock } from "./api";
import { E2E_USER } from "./data";

export const API = "http://api.e2e.invalid";

type Fixtures = {
  api: ApiMock;
  loggedIn: Page;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const unmocked: string[] = [];
    // Cualquier dominio externo que no sea la app ni la API ficticia se bloquea.
    await page.route(/^https?:\/\/(?!localhost|api\.e2e\.invalid)/, (route) => route.abort("blockedbyclient"));
    // Registrada antes que los mocks = menor prioridad: solo atrapa lo que ningún mock cubrió.
    await page.route(`${API}/**`, (route) => {
      unmocked.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort("blockedbyclient");
    });
    await use(page);
    expect(unmocked, "Peticiones a la API sin mock").toEqual([]);
  },

  api: async ({ page }, use) => {
    await use(await mockApi(page));
  },

  loggedIn: async ({ page, api }, use) => {
    await page.addInitScript(() => localStorage.setItem("eva_access_token", "e2e-token"));
    api.me(E2E_USER);
    await use(page);
  },
});

export { expect };
```

- En Playwright, cuando varias rutas coinciden, gana la **última registrada**. Por eso los mocks (registrados después) tienen prioridad sobre la guardia.
- La sesión replica lo que hace `authClient`: el token vive en `localStorage["eva_access_token"]` (`src/services/authClient.ts:138`) y el usuario sale de `GET /users/me` (`:67`).

### 3.4 Mocks (`e2e/fixtures/api.ts`)

- Se basa en `e2e/helpers/apiMocks.ts` de la rama `Rama_prueba` (commit `8954784`). Cambios respecto a ese archivo:
  - Usar `API` en lugar de `localhost:8000`.
  - Quitar todo lo de Supabase.
  - Exponer funciones que el test puede sobrescribir.
- Cada mock acepta un override para probar errores:

```ts
api.insights({ status: 200, body: { insight: "…", disclaimer: "…", is_automatic: false } }); // respuesta de IA (Groq o Cloudflare: el front no distingue)
api.insights({ status: 200, body: { insight: "…", disclaimer: "…", is_automatic: true } });  // respaldo por reglas
api.login({ status: 400, body: { detail: "LOGIN_BAD_CREDENTIALS" } });
```

Endpoints que se mockean (los que usa el frontend en `src/services/*`):

| Método | Ruta | Usado por |
|---|---|---|
| POST | `/auth/jwt/login` (form-urlencoded) | `authClient.login` |
| POST | `/auth/register` | `authClient.register` |
| GET | `/users/me` | `authClient.me` |
| POST | `/auth/forgot-password`, `/auth/reset-password`, `/auth/request-verify-token`, `/auth/verify` | páginas de auth |
| DELETE | `/auth/account` | borrado de cuenta |
| GET/POST/PUT | `/cycles`, `/cycles/{id}` | `cycleService` |
| GET | `/symptoms` | `symptomService` (catálogo) |
| GET/POST/PUT | `/daily-logs`, `/daily-logs/{id}` | `symptomService` |
| POST | `/insights` · GET `/insights/history` | `insightService` |
| GET | `/export/csv`, `/export/pdf` | `exportService` |
| POST | `/sync` | `syncManager` |

Si el frontend empieza a usar un endpoint nuevo, la guardia de red lo detecta y obliga a agregar su mock.

### 3.5 Datos (`e2e/fixtures/data.ts`)

- `E2E_USER = { id: "00000000-0000-4000-8000-000000000001", email: "test@eva.test", is_active: true, is_verified: true, is_superuser: false }`.
- Las fechas se calculan con un helper `daysAgo(n)` para que los tests no caduquen.
- El catálogo de síntomas es un subconjunto fijo (5 síntomas, uno por categoría).

## 4. Flujos obligatorios

| Spec | Test | Etiqueta | Issue |
|---|---|---|---|
| `auth` | muestra el formulario de login | `@smoke` | — |
| `auth` | redirige a /login sin sesión | `@smoke` | — |
| `auth` | inicia sesión y llega al dashboard | `@smoke` | — |
| `auth` | muestra error con credenciales incorrectas | | — |
| `auth` | avisa si el correo no está verificado | | — |
| `auth` | registro muestra el aviso de verificación (sin auto-login) | | — |
| `auth` | no permite registrarse sin aceptar términos y la autorización de datos sensibles | `@smoke` | T22 |
| `auth` | los enlaces a `/legal/privacidad` y `/legal/terminos` abren las páginas | | T22 |
| `auth` | cerrar sesión borra el token y vuelve a /login | | — |
| `cycles` | crea un ciclo y aparece en el calendario | `@smoke` | #55 |
| `symptoms` | registra síntomas con intensidad y flujo | `@smoke` | #27 |
| `symptoms` | valida una temperatura fuera de rango | | #27 |
| `insights` | muestra la respuesta del LLM con su disclaimer | `@smoke` | — |
| `insights` | con `is_automatic=true` muestra "Respuesta automática"; con `false` no muestra ninguna etiqueta | | — |
| `insights` | la respuesta no menciona el proveedor ni el modelo en ningún lugar de la UI | | RX-06 |
| `insights` | error de red muestra un mensaje amable y permite reintentar | | — |
| `export` | descarga el CSV (nombre y `content-type`) | `@smoke` | #52 |
| `export` | descarga el PDF (empieza con `%PDF`) | | #52 |
| `account` | borrar la cuenta llama a `DELETE /auth/account`, vacía IndexedDB y redirige | | — |
| `offline` | muestra el indicador offline | | #38 |
| `offline` | registra sin red y sincroniza al reconectar (`POST /sync`) | | #38 (`test.fixme` hasta T17) |

## 5. Patrones

```ts
import { test, expect } from "./fixtures/test";

test("registra síntomas con intensidad y flujo @smoke", async ({ loggedIn: page, api }) => {
  api.cycles(); api.symptomsCatalog(); api.dailyLogs();
  await page.goto("/symptoms");

  await page.getByRole("button", { name: /cólicos/i }).click();
  await page.getByLabel(/intensidad/i).fill("3");
  await page.getByRole("radio", { name: /moderado/i }).check();

  const saved = page.waitForResponse((r) => r.url().endsWith("/daily-logs") && r.request().method() === "POST");
  await page.getByRole("button", { name: /guardar/i }).click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByText(/registro guardado/i)).toBeVisible();
});
```

Descargas:
```ts
const download = page.waitForEvent("download");
await page.getByRole("button", { name: /exportar csv/i }).click();
expect((await download).suggestedFilename()).toMatch(/\.csv$/);
```

Offline:
```ts
await page.context().setOffline(true);
await expect(page.getByText(/sin conexión/i)).toBeVisible();
```

## 6. Correr localmente (WSL)

```bash
cd frontend
npx playwright install chromium
sudo npx playwright install-deps chromium   # una vez; arregla "libnspr4.so: cannot open shared object file"
npm run test:e2e                            # toda la suite
npx playwright test --grep @smoke           # solo smoke
npx playwright test e2e/auth.spec.ts --headed --debug
npx playwright show-report e2e-report
```

## 7. CI (`.github/workflows/frontend.yml`)

Reemplaza el bloque comentado de `frontend.yml:58-78`:

```yaml
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: "true"

      - name: Upload E2E report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: frontend/e2e-report/
          retention-days: 7
```

El job de E2E **no recibe ningún secreto**: no los necesita.

## 8. Mantenimiento

- **Flaky:** si un test falla y pasa en el reintento dos veces en una semana, se arregla o se marca `test.fixme` con un issue enlazado. No se suben los `retries`.
- **Cambio de UI:** si cambia un texto o un rol, se actualiza el test en el mismo PR.
- **Endpoint nuevo:** se agregan el mock y su fila en §3.4 en el mismo PR.
- **Checklist por spec nuevo:** usa `test` de `fixtures/test.ts` · solo datos sintéticos · selectores accesibles · sin `waitForTimeout` · título en español · etiqueta `@smoke` si es un flujo crítico.

## 9. Migración desde la suite actual

> La tarea T20 (Supabase cero) **borra** la suite vieja. Para rescatar selectores o esperas, se consulta el tag `archive/e2e_fail` (commit `82968bb`) y `archive/Rama_prueba` (`8954784`, `apiMocks.ts`). La tabla queda como referencia de qué reemplaza a qué.

| Archivo actual (Prueba3) | Problema | Acción |
|---|---|---|
| `e2e/helpers/auth.ts` | Sesión Supabase (`sb-<ref>-auth-token`) | Eliminar; lo reemplaza `fixtures/test.ts` |
| `e2e/login.spec.ts` | Válido, pero aislado | Pasarlo a `auth.spec.ts` y ampliarlo |
| `e2e/symptom-flow.spec.ts` | Usa `mockSupabaseAuth` y no mockea la API | Pasarlo a `symptoms.spec.ts` con fixtures; rescatar los selectores de `82968bb` |
| `e2e/export.spec.ts` | Mezcla tests de API con tests de UI | Dejar solo las descargas de UI; mover los filtros a pytest |
| `e2e/regression.spec.ts` | Duplica otros specs | Eliminar; la regresión es la suite completa + `@smoke` |
| `e2e/offline.spec.ts` | Depende de un offline que no existe (DP-18) | Reescribirlo y dejar `fixme` hasta T17 |
| `playwright.config.ts` | `dev` en local, `preview` en CI, sin API ficticia | Reemplazarlo por §3.2 |
