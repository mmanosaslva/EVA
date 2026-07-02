import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

test.describe("Modo offline", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("muestra indicador offline al desconectar red", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /panel/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/sin conexión/i),
    ).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });

  test("permite registrar síntoma offline y muestra en historial al reconectar", async ({
    page,
  }) => {
    await page.goto("/symptoms", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /síntomas/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);

    await expect(
      page.getByText(/sin conexión/i),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /dolor abdominal/i }).click();
    await page.getByRole("button", { name: /moderad/i }).click();

    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(
      page.getByText(/guardado|registrado/i),
    ).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);

    await expect(
      page.getByText(/conexión restablecida|sincronizando/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("accede al dashboard desde cache sin conexión", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /panel/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);

    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /panel/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(false);
  });

  test("crea ciclo offline y aparece offline indicator", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: /calendario/i }),
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });
});
