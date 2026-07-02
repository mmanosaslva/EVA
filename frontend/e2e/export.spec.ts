import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

test.describe("Exportación de datos", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("carga la página con los elementos principales", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/descargar mis datos/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/informe médico/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /privacidad/i })).toBeVisible({ timeout: 10000 });
  });

  test("botón de descarga CSV está presente y habilitado", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const csvButton = page.getByRole("button", { name: /descargar mis datos/i });
    await expect(csvButton).toBeVisible({ timeout: 10000 });
    await expect(csvButton).toBeEnabled();
  });

  test("botón de generar PDF está presente y habilitado", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const pdfButton = page.getByRole("button", { name: /generar informe/i });
    await expect(pdfButton).toBeVisible({ timeout: 10000 });
    await expect(pdfButton).toBeEnabled();
  });

  test("selector de ciclos para PDF funciona", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const option3 = page.getByRole("button", { name: /últimos 3/i });
    const option6 = page.getByRole("button", { name: /últimos 6/i });
    const option12 = page.getByRole("button", { name: /últimos 12/i });

    await expect(option3).toBeVisible();
    await expect(option6).toBeVisible();
    await expect(option12).toBeVisible();

    await option3.click();
    await expect(option3).toHaveAttribute("class", /bg-eva-50/);

    await option12.click();
    await expect(option12).toHaveAttribute("class", /bg-eva-50/);
  });

  test("modal de eliminar cuenta se abre y cierra", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /eliminar mi cuenta/i }).click();
    await expect(page.getByText(/¿eliminar tu cuenta/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /cancelar/i }).click();
    await expect(page.getByText(/¿eliminar tu cuenta/i)).not.toBeVisible();
  });

  test("descarga CSV al hacer clic en el botón", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const csvButton = page.getByRole("button", { name: /descargar mis datos/i });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      csvButton.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/eva_datos_\d{4}-\d{2}-\d{2}\.csv$/);
    download.cancel().catch(() => {});
  });

  test("descarga PDF al hacer clic en el botón", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({ timeout: 15000 });

    const pdfButton = page.getByRole("button", { name: /generar informe/i });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      pdfButton.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/eva_informe_\d{4}-\d{2}-\d{2}\.pdf$/);
    download.cancel().catch(() => {});
  });
});
