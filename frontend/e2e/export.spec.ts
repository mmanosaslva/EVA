import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

test.describe("Exportación de datos", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("página de exportación carga con todas las secciones", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/gestioná tus datos/i)).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Mis datos")).toBeVisible();
    await expect(page.getByText("Informe médico")).toBeVisible();
    await expect(page.getByText("Privacidad")).toBeVisible();
    await expect(page.getByText("Zona de peligro")).toBeVisible();
  });

  test("botón CSV está presente y habilitado", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    const csvButton = page.getByRole("button", { name: /descargar mis datos/i });
    await expect(csvButton).toBeVisible({ timeout: 10000 });
    await expect(csvButton).toBeEnabled();
  });

  test("click en botón CSV muestra estado de descarga", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    const csvButton = page.getByRole("button", { name: /descargar mis datos/i });
    await csvButton.click();

    await expect(page.getByText(/descargando\.\.\./i)).toBeVisible({ timeout: 5000 });
  });

  test("botón PDF está presente y habilitado", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    const pdfButton = page.getByRole("button", { name: /generar informe/i });
    await expect(pdfButton).toBeVisible({ timeout: 10000 });
    await expect(pdfButton).toBeEnabled();
  });

  test("selector de ciclos para PDF permite cambiar valor", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: /últimos 3/i }).click();
    await page.getByRole("button", { name: /últimos 6/i }).click();
    await page.getByRole("button", { name: /últimos 12/i }).click();
  });

  test("click en botón PDF muestra estado de generación", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    const pdfButton = page.getByRole("button", { name: /generar informe/i });
    await pdfButton.click();

    await expect(page.getByText(/generando pdf/i)).toBeVisible({ timeout: 5000 });
  });

  test("sección de privacidad tiene contenido informativo", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText(/tus datos son tuyos/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/no compartimos/i)).toBeVisible();
  });

  test("modal de eliminar cuenta se abre y cierra en paso 1", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Eliminar mi cuenta", exact: true }).click();
    await expect(page.getByText(/¿eliminar tu cuenta/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("modal paso 2 requiere escribir ELIMINAR para confirmar", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /configuración/i })).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Eliminar mi cuenta", exact: true }).click();

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();

    await expect(page.getByText(/confirmación final/i)).toBeVisible({ timeout: 5000 });

    const deleteBtn = page.getByRole("button", { name: "Eliminar cuenta", exact: true });
    await expect(deleteBtn).toBeDisabled();

    await page.getByLabel(/confirmar eliminación/i).fill("ELIMINAR");
    await expect(deleteBtn).toBeEnabled();

    await deleteBtn.click();
    await expect(page.getByText("Cuenta eliminada")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/gracias por usar eva/i)).toBeVisible();
  });
});
