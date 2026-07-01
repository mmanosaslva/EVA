import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

test.describe("Flujo de registro de síntomas", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("muestra la página de síntomas con el formulario de registro", async ({ page }) => {
    await page.goto("/symptoms");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /registrar/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /historial/i })).toBeVisible();
    await expect(page.getByText("Nuevo registro")).toBeVisible();
  });

  test("permite seleccionar un síntoma y ajustar intensidad", async ({ page }) => {
    await page.goto("/symptoms");
    await page.waitForLoadState("networkidle");

    const symptomBtn = page.getByRole("button", { name: /dolor abdominal/i });
    await expect(symptomBtn).toBeVisible();

    await symptomBtn.click();
    await expect(symptomBtn).toHaveAttribute("aria-pressed", "true");

    const slider = page.getByRole("slider", { name: /intensidad de dolor abdominal/i });
    await expect(slider).toBeVisible();
    await slider.fill("4");
  });

  test("permite seleccionar nivel de flujo", async ({ page }) => {
    await page.goto("/symptoms");
    await page.waitForLoadState("networkidle");

    const flowBtn = page.getByRole("button", { name: /moderado/i });
    await expect(flowBtn).toBeVisible();

    await flowBtn.click();
    await expect(flowBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("completa el formulario y guarda el registro", async ({ page }) => {
    await page.goto("/symptoms");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /dolor abdominal/i }).click();

    await page.getByRole("button", { name: /moderado/i }).click();

    const tempInput = page.getByLabel(/temperatura basal/i);
    await tempInput.fill("36.5");

    const notesInput = page.getByPlaceholder(/cómo te sientes/i);
    await notesInput.fill("Día con molestias leves");

    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByText("Registro guardado correctamente")).toBeVisible({ timeout: 5000 });
  });

  test("muestra validación de temperatura fuera de rango", async ({ page }) => {
    await page.goto("/symptoms");
    await page.waitForLoadState("networkidle");

    const tempInput = page.getByLabel(/temperatura basal/i);
    await tempInput.fill("50");

    await expect(page.getByText("Entre 35°C y 42°C")).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });
});
