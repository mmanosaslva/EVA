import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

const SYMPTOMS_URL =
  "/symptoms?date=2026-06-28&cycleId=c3-5e7a-4b1d-9f3c-8a2e1d4b6f00";

test.describe("Flujo de registro de síntomas", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("muestra la página de síntomas con el formulario de registro", async ({ page }) => {
    await page.goto(SYMPTOMS_URL);
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("tab", { name: /registrar/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /historial/i })).toBeVisible();
    await expect(page.getByText("Nuevo registro")).toBeVisible();
  });

  test("permite seleccionar un síntoma y ajustar intensidad", async ({ page }) => {
    await page.goto(SYMPTOMS_URL);
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });

    const symptomBtn = page.getByRole("button", { name: /dolor abdominal/i });
    await expect(symptomBtn).toBeVisible({ timeout: 10000 });

    await symptomBtn.click();
    await expect(symptomBtn).toHaveAttribute("aria-pressed", "true");

    const slider = page.getByRole("slider", { name: /intensidad de dolor abdominal/i });
    await expect(slider).toBeVisible({ timeout: 10000 });
    await slider.evaluate(
      (el: HTMLInputElement, value: string) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        nativeSetter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      },
      "4",
    );
  });

  test("permite seleccionar nivel de flujo", async ({ page }) => {
    await page.goto(SYMPTOMS_URL);
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });

    const flowBtn = page.getByRole("button", { name: /medio/i });
    await slider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "4";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  test("permite seleccionar nivel de flujo", async ({ page }) => {
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });

    const flowBtn = page.getByRole("button", { name: /moderad/i });
    await expect(flowBtn).toBeVisible({ timeout: 10000 });

    await flowBtn.click();
    await expect(flowBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("completa el formulario y guarda el registro", async ({ page }) => {
    await page.goto(SYMPTOMS_URL);
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /dolor abdominal/i }).click();

    await page.getByRole("button", { name: /medio/i }).click();
    await page.getByRole("button", { name: /moderad/i }).click();

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
    await page.goto(SYMPTOMS_URL);
    await page.goto("/symptoms");
    await expect(page.getByRole("heading", { name: /síntomas/i })).toBeVisible({ timeout: 15000 });

    const tempInput = page.getByLabel(/temperatura basal/i);
    await expect(tempInput).toBeVisible({ timeout: 10000 });
    await tempInput.fill("50");

    await expect(page.getByText("Entre 35°C y 42°C")).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });
});
