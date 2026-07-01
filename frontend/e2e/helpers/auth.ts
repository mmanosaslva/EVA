import type { Page } from "@playwright/test";

const PROJECT_REF = "nrvkuofqbzvrciyvhgbs";

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
}

export async function clearSupabaseAuth(page: Page) {
  const storageKey = `sb-${PROJECT_REF}-auth-token`;
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
}
