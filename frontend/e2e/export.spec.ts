import { test, expect } from "@playwright/test";
import { mockSupabaseAuth } from "./helpers/auth";

const API_BASE = "http://localhost:8000";

const CSV_MOCK_BODY =
  "Fecha inicio ciclo,Fecha fin ciclo,Duracion (dias),Fecha registro,Nivel flujo,Temperatura,Sintoma,Intensidad,Notas\n" +
  "2025-06-01,2025-06-05,4,2025-06-01,medium,36.5,Dolor abdominal,3,colicos\n" +
  "2025-06-01,2025-06-05,4,2025-06-02,light,36.7,,,";

const MOCK_PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
  ...Array(600).fill(0x0a),
]);

function mockPdfBuffer() {
  return [...MOCK_PDF_BYTES];
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Disposition",
  };
}

test.describe("Exportación de datos", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page);

    await page.route(
      (url) => url.hostname === "localhost" && url.pathname === "/export/csv",
      (route) => {
        const auth =
          route.request().headers()["authorization"] || "";
        if (auth !== "Bearer test-token") {
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            headers: corsHeaders(),
            body: JSON.stringify({ detail: "Token invalido o expirado" }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "text/csv; charset=utf-8",
          headers: {
            ...corsHeaders(),
            "Content-Disposition":
              "attachment; filename=eva_datos_2025-07-01.csv",
          },
          body: CSV_MOCK_BODY,
        });
      },
    );

    await page.route(
      (url) =>
        url.hostname === "localhost" && url.pathname === "/export/pdf",
      (route) => {
        const auth =
          route.request().headers()["authorization"] || "";
        if (auth !== "Bearer test-token") {
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            headers: corsHeaders(),
            body: JSON.stringify({ detail: "Token invalido o expirado" }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/pdf",
          headers: {
            ...corsHeaders(),
            "Content-Disposition":
              "attachment; filename=eva_informe_medico_2025-07-01.pdf",
          },
          body: Buffer.from(mockPdfBuffer()),
        });
      },
    );
  });

  test("descarga CSV con headers correctos", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch("http://localhost:8000/export/csv", {
        headers: { Authorization: "Bearer test-token" },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        text,
        contentType: res.headers.get("content-type") || "",
        disposition: res.headers.get("content-disposition") || "",
      };
    });

    expect(result.ok).toBe(true);
    const lines = result.text.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain("Fecha inicio ciclo");
    expect(lines[0]).toContain("Duracion");
    expect(lines[0]).toContain("Sintoma");
    expect(lines[0]).toContain("Intensidad");
    expect(result.disposition).toContain("attachment");
    expect(result.disposition).toContain("eva_datos_");
    expect(result.disposition).toContain(".csv");
    expect(result.contentType).toContain("text/csv");
  });

  test("descarga PDF con estructura válida", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch(
        "http://localhost:8000/export/pdf?cycles_back=3",
        { headers: { Authorization: "Bearer test-token" } },
      );
      const buf = await res.arrayBuffer();
      return {
        ok: res.ok,
        status: res.status,
        bytes: [...new Uint8Array(buf)],
        contentType: res.headers.get("content-type") || "",
        disposition: res.headers.get("content-disposition") || "",
      };
    });

    expect(result.ok).toBe(true);
    expect(result.bytes.length).toBeGreaterThan(500);

    const header = String.fromCharCode(...result.bytes.slice(0, 4));
    expect(header).toBe("%PDF");
    expect(result.disposition).toContain("attachment");
    expect(result.disposition).toContain("eva_informe_medico_");
    expect(result.disposition).toContain(".pdf");
    expect(result.contentType).toContain("application/pdf");
  });

  test("rechaza request sin autenticación", async ({ page }) => {
    const csvResult = await page.evaluate(async () => {
      const res = await fetch("http://localhost:8000/export/csv");
      return { status: res.status };
    });
    expect(csvResult.status).toBe(401);

    const pdfResult = await page.evaluate(async () => {
      const res = await fetch("http://localhost:8000/export/pdf");
      return { status: res.status };
    });
    expect(pdfResult.status).toBe(401);
  });

  test("filtra por from_date", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch(
        "http://localhost:8000/export/csv?from_date=2099-01-01",
        { headers: { Authorization: "Bearer test-token" } },
      );
      const text = await res.text();
      return { ok: res.ok, text };
    });

    expect(result.ok).toBe(true);
    const lines = result.text.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain("Fecha inicio ciclo");
  });

  test("acepta to_date como parámetro", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch(
        "http://localhost:8000/export/csv?from_date=2024-01-01&to_date=2024-12-31",
        { headers: { Authorization: "Bearer test-token" } },
      );
      const text = await res.text();
      return { ok: res.ok, text };
    });

    expect(result.ok).toBe(true);
    const lines = result.text.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toContain("Fecha inicio ciclo");
  });
});
