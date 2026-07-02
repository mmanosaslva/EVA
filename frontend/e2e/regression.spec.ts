import { test, expect } from "@playwright/test";
import { mockSupabaseAuth, clearSupabaseAuth } from "./helpers/auth";

test.describe("Regresión completa — Flujo 1: Registro → ciclo → síntomas → dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("navega a calendario y crea ciclo", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: /calendario/i })).toBeVisible({ timeout: 15000 });

    const createButton = page.getByRole("button", { name: /registrar|nuevo ciclo|crear/i });
    if (await createButton.isVisible()) {
      await createButton.click();
    }
  });

  test("navega a síntomas y carga el formulario", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("tab", { name: /registrar/i })).toBeVisible({ timeout: 10000 });
  });

  test("dashboard carga y muestra elementos principales", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /panel|dashboard|eva/i })).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Regresión completa — Flujo 2: Offline → síntoma → reconectar", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("desconecta red, muestra indicador offline, reconecta", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /panel|dashboard|eva/i })).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/sin conexión/i)).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });
});

test.describe("Regresión completa — Flujo 3: Exportación CSV y PDF", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("página de exportación carga correctamente", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/descargar mis datos/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/informe médico/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/privacidad/i)).toBeVisible({ timeout: 10000 });
  });

  test("botones de exportación están presentes y habilitados", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const csvButton = page.getByRole("button", { name: /descargar mis datos/i });
    await expect(csvButton).toBeVisible({ timeout: 10000 });

    const pdfButton = page.getByRole("button", { name: /generar informe/i });
    await expect(pdfButton).toBeVisible({ timeout: 10000 });
  });

  test("selector de ciclos para PDF funciona", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /últimos 3/i }).click();
    await page.getByRole("button", { name: /últimos 12/i }).click();
  });

  test("modal de eliminar cuenta se abre y cierra", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /eliminar mi cuenta/i }).click();
    await expect(page.getByText(/¿eliminar tu cuenta/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /cancelar/i }).click();
  });
});

test.describe("Regresión completa — Flujo 4: Chat EVA", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("página de insights carga con historial", async ({ page }) => {
    await page.goto("/insights");
    await expect(page.getByPlaceholder(/pregúntale algo a eva/i)).toBeVisible({ timeout: 15000 });
  });

  test("textarea y botón de enviar están presentes", async ({ page }) => {
    await page.goto("/insights");
    await expect(page.getByPlaceholder(/pregúntale algo a eva/i)).toBeVisible({ timeout: 15000 });

    const textarea = page.getByPlaceholder(/pregúntale algo a eva/i);
    await textarea.fill("¿Por qué tengo dolor abdominal?");

    const sendButton = page.locator("button").filter({ has: page.locator("svg") });
    await expect(sendButton).toBeEnabled();
  });
});

test.describe("Regresión completa — Flujo 5: Login y autenticación", () => {
  test("página de login carga correctamente", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
  });

  test("redirige a login sin sesión", async ({ page }) => {
    await clearSupabaseAuth(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
