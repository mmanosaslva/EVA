import { test, expect } from "@playwright/test";

test.describe("Página de login", () => {
  test("muestra el formulario de inicio de sesión", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "EVA" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Inicia sesión para continuar")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("redirige a /login cuando no hay sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "EVA" })).toBeVisible({ timeout: 15000 });
  });

  test("muestra enlace para ir a registro", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "EVA" })).toBeVisible({ timeout: 15000 });

    const registerLink = page.getByRole("link", { name: /regístrate/i });
    await expect(registerLink).toBeVisible();
  });
});
