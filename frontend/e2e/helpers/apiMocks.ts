import type { Page } from "@playwright/test";

const mockCycles = [
  {
    id: "c3-5e7a-4b1d-9f3c-8a2e1d4b6f00",
    user_id: "test-user-id",
    start_date: "2026-06-27",
    end_date: null,
    duration_days: null,
    created_at: "2026-06-27T08:00:00",
    updated_at: "2026-06-27T08:00:00",
  },
  {
    id: "c2-4d6b-3c2e-8f1a-7b9d0c5e3a11",
    user_id: "test-user-id",
    start_date: "2026-05-29",
    end_date: "2026-06-02",
    duration_days: 5,
    created_at: "2026-05-29T09:00:00",
    updated_at: "2026-05-29T09:00:00",
  },
  {
    id: "c1-3a5c-2b1d-7e9f-6d8c0b4a2e22",
    user_id: "test-user-id",
    start_date: "2026-04-30",
    end_date: "2026-05-04",
    duration_days: 5,
    created_at: "2026-04-30T07:30:00",
    updated_at: "2026-04-30T07:30:00",
  },
  {
    id: "c0-2b4a-1c0d-6e8f-5c7b0a3d1e33",
    user_id: "test-user-id",
    start_date: "2026-03-31",
    end_date: "2026-04-04",
    duration_days: 5,
    created_at: "2026-03-31T08:00:00",
    updated_at: "2026-03-31T08:00:00",
  },
];

export async function mockCyclesApi(page: Page): Promise<void> {
  await page.route("**localhost:8000/cycles**", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: mockCycles.length,
          limit: 20,
          offset: 0,
          cycles: mockCycles,
        }),
      });
    } else if (method === "POST") {
      const now = new Date().toISOString();
      const body = route.request().postDataJSON();
      const newCycle = {
        id: `c-${Date.now()}`,
        user_id: "test-user-id",
        start_date: body.start_date,
        end_date: body.end_date ?? null,
        duration_days: body.end_date ? 5 : null,
        created_at: now,
        updated_at: now,
      };
      mockCycles.unshift(newCycle);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newCycle),
      });
    } else if (method === "PUT") {
      const urlParts = route.request().url().split("/");
      const cycleId = urlParts[urlParts.length - 1].split("?")[0];
      const body = route.request().postDataJSON();
      const idx = mockCycles.findIndex((c) => c.id === cycleId);
      if (idx !== -1) {
        mockCycles[idx] = { ...mockCycles[idx], ...body, updated_at: new Date().toISOString() };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCycles[idx]),
        });
      } else {
        await route.fulfill({ status: 404, body: JSON.stringify({ detail: "Cycle not found" }) });
      }
    } else if (method === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.fulfill({ status: 405 });
    }
  });
}

const mockSymptomsCatalog = [
  { id: 1, name: "Dolor abdominal", category: "fisica", common_phase: "menstruacion" },
  { id: 2, name: "Dolor de cabeza", category: "fisica", common_phase: "menstruacion" },
  { id: 3, name: "Fatiga", category: "fisica", common_phase: "menstruacion" },
  { id: 4, name: "Sensibilidad en senos", category: "fisica", common_phase: "lutea" },
  { id: 5, name: "Dolor lumbar", category: "fisica", common_phase: "menstruacion" },
  { id: 16, name: "Hinchazón", category: "digestiva", common_phase: "lutea" },
  { id: 21, name: "Irritabilidad", category: "emocional", common_phase: "lutea" },
  { id: 22, name: "Ansiedad", category: "emocional", common_phase: "lutea" },
  { id: 23, name: "Tristeza", category: "emocional", common_phase: "lutea" },
  { id: 24, name: "Cambios de humor", category: "emocional", common_phase: "lutea" },
  { id: 10, name: "Calambres", category: "fisica", common_phase: "menstruacion" },
  { id: 14, name: "Dolor ovulatorio", category: "fisica", common_phase: "ovulacion" },
];

const mockDailyLogs: Record<string, unknown[]> = {};

export async function mockSymptomsApi(page: Page): Promise<void> {
  await page.route("**localhost:8000/symptoms**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method !== "GET") {
      await route.fulfill({ status: 405 });
      return;
    }

    const parts = url.split("/symptoms");
    const idStr = parts[1]?.split("?")[0]?.replace(/\//g, "");

    if (idStr) {
      const symptom = mockSymptomsCatalog.find((s) => s.id === Number(idStr));
      if (symptom) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(symptom),
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSymptomsCatalog),
      });
    }
  });

  await page.route("**localhost:8000/daily-logs**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "GET") {
      const urlObj = new URL(url);
      const cycleId = urlObj.searchParams.get("cycle_id") || "";

      const logs = mockDailyLogs[cycleId] || [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: logs.length,
          limit: 50,
          offset: 0,
          logs,
        }),
      });
    } else if (method === "POST") {
      const now = new Date().toISOString();
      const body = route.request().postDataJSON();
      const newLog = {
        id: `log-${Date.now()}`,
        cycle_id: body.cycle_id,
        date: body.date,
        flow_level: body.flow_level ?? "none",
        temperature: body.temperature ?? null,
        notes: body.notes ?? null,
        created_at: now,
        updated_at: now,
        symptoms: (body.symptoms || []).map((s: { symptom_id: number; intensity: number }) => {
          const catalog = mockSymptomsCatalog.find((c) => c.id === s.symptom_id);
          return {
            symptom_id: s.symptom_id,
            intensity: s.intensity,
            name: catalog?.name ?? `Síntoma ${s.symptom_id}`,
            category: catalog?.category ?? "otra",
            common_phase: catalog?.common_phase ?? null,
          };
        }),
      };

      if (!mockDailyLogs[body.cycle_id]) {
        mockDailyLogs[body.cycle_id] = [];
      }
      mockDailyLogs[body.cycle_id].push(newLog);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newLog),
      });
    } else if (method === "PUT") {
      const parts = url.split("/daily-logs/");
      const logId = parts[1]?.split("?")[0];

      for (const logs of Object.values(mockDailyLogs)) {
        const idx = logs.findIndex((l: { id: string }) => l.id === logId);
        if (idx !== -1) {
          const body = route.request().postDataJSON();
          logs[idx] = { ...logs[idx], ...body, updated_at: new Date().toISOString() };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(logs[idx]),
          });
          return;
        }
      }
      await route.fulfill({ status: 404 });
    } else {
      await route.fulfill({ status: 405 });
    }
  });
}

const mockInsightHistory: unknown[] = [];

export async function mockInsightsApi(page: Page): Promise<void> {
  await page.route("**localhost:8000/insights**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (url.includes("/insights/history") && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: mockInsightHistory.length,
          limit: 20,
          offset: 0,
          insights: mockInsightHistory,
        }),
      });
    } else if (method === "POST") {
      const body = route.request().postDataJSON();
      const now = new Date().toISOString();
      const response = {
        insight: `[Respuesta mock] ${body.question}`,
        phase: null,
        source: "mock/test",
        disclaimer: "EVA no reemplaza el consejo médico profesional.",
      };
      mockInsightHistory.unshift({
        id: `ins-${Date.now()}`,
        question: body.question,
        insight: response.insight,
        phase: null,
        source: "mock/test",
        created_at: now,
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    } else {
      await route.fulfill({ status: 405 });
    }
  });
}

export async function mockExportApi(page: Page): Promise<void> {
  await page.route("**localhost:8000/export/csv**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 405 });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const csvContent =
      "Fecha inicio ciclo,Fecha fin ciclo,Duración,Fecha registro,Nivel flujo,Temperatura,Síntoma,Intensidad,Notas\n" +
      "2026-06-27,,4,2026-06-27,Medio,36.5,Dolor abdominal,4,\n";

    await route.fulfill({
      status: 200,
      contentType: "text/csv",
      headers: {
        "Content-Disposition": `attachment; filename="eva_datos_${today}.csv"`,
      },
      body: csvContent,
    });
  });

  await page.route("**localhost:8000/export/pdf**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 405 });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const pdfContent = "%PDF-1.4 fake pdf content";

    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      headers: {
        "Content-Disposition": `attachment; filename="eva_informe_medico_${today}.pdf"`,
      },
      body: pdfContent,
    });
  });
}
