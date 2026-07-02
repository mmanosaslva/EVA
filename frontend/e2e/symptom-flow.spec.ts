import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";
import { mockCyclesApi, mockSymptomsApi } from "./helpers/apiMocks";

test.describe("Flujo de registro de síntomas", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
    await mockCyclesApi(page);
    await mockSymptomsApi(page);
  });

  test("muestra la página de síntomas con el formulario de registro", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: "Síntomas" }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /registrar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /historial/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dolor abdominal/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/nuevo registro|editando registro/i)).toBeVisible();
  });

  test("permite seleccionar un síntoma y ajustar intensidad", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: "Síntomas" }).first()).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: /dolor abdominal/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /fatiga/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Física")).toBeVisible();
    await expect(page.getByText("Digestiva")).toBeVisible();
    await expect(page.getByText("Emocional")).toBeVisible();
  });

  test("permite seleccionar nivel de flujo", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: "Síntomas" }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /medio/i })).toBeVisible({ timeout: 10000 });

    const flowBtn = page.getByRole("button", { name: /medio/i });
    await flowBtn.click();
    await expect(flowBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("completa el formulario y guarda el registro", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: "Síntomas" }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /dolor abdominal/i }).click();

    await page.getByRole("button", { name: /medio/i }).click();

    const tempInput = page.getByLabel(/temperatura basal/i);
    await expect(tempInput).toBeVisible({ timeout: 10000 });
    await tempInput.fill("36.5");

    const notesInput = page.getByPlaceholder(/cómo te sientes/i);
    await expect(notesInput).toBeVisible({ timeout: 10000 });
    await notesInput.fill("Día con molestias leves");

    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByText("Registro guardado correctamente")).toBeVisible({ timeout: 5000 });
  });

  test("muestra validación de temperatura fuera de rango", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: "Síntomas" }).first()).toBeVisible({ timeout: 15000 });

    const tempInput = page.getByLabel(/temperatura basal/i);
    await expect(tempInput).toBeVisible({ timeout: 10000 });
    await tempInput.fill("50");

    await expect(page.getByText("Entre 35°C y 42°C", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });
});
