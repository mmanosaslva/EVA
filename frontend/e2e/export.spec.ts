import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

const API_BASE = "http://localhost:8000";

test.describe("Exportación de datos", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);
  });

  test("descarga CSV con headers correctos", async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/export/csv`, {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    const lines = content.trim().split("\n");

    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain("Fecha inicio ciclo");
    expect(lines[0]).toContain("Duracion");
    expect(lines[0]).toContain("Sintoma");
    expect(lines[0]).toContain("Intensidad");

    const disposition = response.headers()["content-disposition"] || "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("eva_datos_");
    expect(disposition).toContain(".csv");

    const contentType = response.headers()["content-type"] || "";
    expect(contentType).toContain("text/csv");
  });

  test("descarga PDF con estructura válida", async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/export/pdf?cycles_back=3`, {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(response.ok()).toBeTruthy();

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500);

    const header = buffer.slice(0, 4).toString();
    expect(header).toBe("%PDF");

    const disposition = response.headers()["content-disposition"] || "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("eva_informe_medico_");
    expect(disposition).toContain(".pdf");

    const contentType = response.headers()["content-type"] || "";
    expect(contentType).toContain("application/pdf");
  });

  test("rechaza request sin autenticación", async ({ page }) => {
    const csvResponse = await page.request.get(`${API_BASE}/export/csv`);
    expect(csvResponse.status()).toBe(401);

    const pdfResponse = await page.request.get(`${API_BASE}/export/pdf`);
    expect(pdfResponse.status()).toBe(401);
  });

  test("filtra por from_date", async ({ page }) => {
    const futureDate = "2099-01-01";
    const response = await page.request.get(
      `${API_BASE}/export/csv?from_date=${futureDate}`,
      { headers: { Authorization: "Bearer test-token" } },
    );
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(1);
  });

  test("acepta to_date como parámetro", async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/export/csv?from_date=2024-01-01&to_date=2024-12-31`,
      { headers: { Authorization: "Bearer test-token" } },
    );
    expect(response.ok()).toBeTruthy();
  });
});
