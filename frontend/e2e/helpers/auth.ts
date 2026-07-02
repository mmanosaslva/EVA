import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Page } from "@playwright/test";

function getSupabaseProjectRef(): string {
  // 1. Intentar desde variable de entorno
  if (process.env.VITE_SUPABASE_URL) {
    const match = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) return match[1];
  }

  // 2. Leer desde .env (Playwright corre desde frontend/)
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^VITE_SUPABASE_URL=(.+)$/m);
    if (match) {
      const url = match[1].trim();
      const refMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (refMatch) return refMatch[1];
    }
  }

  // 3. Fallback para CI
  return "nrvkuofqbzvrciyvhgbs";
}

const PROJECT_REF = getSupabaseProjectRef();

function makeMockSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3Nzg1MTY3NzQsImV4cCI6OTk5OTk5OTk5OX0.mock",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "mock-refresh-token",
    user: {
      id: "test-user-id",
      aud: "authenticated",
      role: "authenticated",
      email: "test@example.com",
      email_confirmed_at: "2025-01-01T00:00:00Z",
      phone: "",
      confirmed_at: "2025-01-01T00:00:00Z",
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email" },
      user_metadata: {},
      identities: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: new Date().toISOString(),
    },
  };
}

export async function mockSupabaseAuth(page: Page) {
  const session = makeMockSession();
  const storageKey = `sb-${PROJECT_REF}-auth-token`;

  await page.addInitScript((args) => {
    const { key, session: sessionData } = args;
    localStorage.setItem(key, JSON.stringify(sessionData));
  }, { key: storageKey, session });

  // Respaldo: interceptar llamadas de verificación de sesión de Supabase
  await page.route("**/auth/v1/user", async (route) => {
    const authHeader = route.request().headers()["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session.user),
      });
    } else {
      await route.fulfill({ status: 401 });
    }
  });
}

export async function clearSupabaseAuth(page: Page) {
  const storageKey = `sb-${PROJECT_REF}-auth-token`;
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
}
