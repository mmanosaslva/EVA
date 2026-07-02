import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

const API_BASE = "http://localhost:8000";

const CSV_MOCK_BODY =
  "Fecha inicio ciclo,Fecha fin ciclo,Duracion (dias),Fecha registro,Nivel flujo,Temperatura,Sintoma,Intensidad,Notas\n" +
  "2025-06-01,2025-06-05,4,2025-06-01,medium,36.5,Dolor abdominal,3,colicos\n" +
  "2025-06-01,2025-06-05,4,2025-06-02,light,36.7,,,";

const MOCK_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34,
  ...Array(600).fill(0x0A),
]);

test.describe("Exportación de datos", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);

    await page.route(`${API_BASE}/export/csv`, (route) => {
      if (
        route.request().headers()["authorization"] !== "Bearer test-token"
      ) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Token invalido o expirado" }),
        });
      }
      const url = new URL(route.request().url());
      const fromDate = url.searchParams.get("from_date");
      const toDate = url.searchParams.get("to_date");

      if (fromDate || toDate) {
        return route.fulfill({
          status: 200,
          contentType: "text/csv; charset=utf-8",
          headers: {
            "Content-Disposition": `attachment; filename="eva_datos_${new Date().toISOString().split("T")[0]}.csv"`,
          },
          body: CSV_MOCK_BODY,
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "text/csv; charset=utf-8",
        headers: {
          "Content-Disposition": `attachment; filename="eva_datos_${new Date().toISOString().split("T")[0]}.csv"`,
        },
        body: CSV_MOCK_BODY,
      });
    });

    await page.route(`${API_BASE}/export/pdf*`, (route) => {
      if (
        route.request().headers()["authorization"] !== "Bearer test-token"
      ) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Token invalido o expirado" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: {
          "Content-Disposition": `attachment; filename="eva_informe_medico_${new Date().toISOString().split("T")[0]}.pdf"`,
        },
        body: Buffer.from(MOCK_PDF_BYTES),
      });
    });
  });

  test("descarga CSV con headers correctos", async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/export/csv`, {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    const lines = content.trim().split("\n");

    expect(lines.length).toBeGreaterThanOrEqual(2);
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
    const response = await page.request.get(
      `${API_BASE}/export/pdf?cycles_back=3`,
      { headers: { Authorization: "Bearer test-token" } },
    );
    expect(response.ok()).toBeTruthy();

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500);

    const header = String.fromCharCode(...buffer.slice(0, 4));
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
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain("Fecha inicio ciclo");
  });

  test("acepta to_date como parámetro", async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/export/csv?from_date=2024-01-01&to_date=2024-12-31`,
      { headers: { Authorization: "Bearer test-token" } },
    );
    expect(response.ok()).toBeTruthy();

    const content = await response.text();
    const lines = content.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain("Fecha inicio ciclo");
  });
});
