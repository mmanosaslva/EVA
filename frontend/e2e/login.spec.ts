import { test, expect } from "@playwright/test";

test.describe("Página de login", () => {
  test("muestra el formulario de inicio de sesión", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("redirige a /login cuando no hay sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("muestra enlace para ir a registro", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const registerLink = page.getByRole("link", { name: /registrate/i });
    await expect(registerLink).toBeVisible();
  });
});
