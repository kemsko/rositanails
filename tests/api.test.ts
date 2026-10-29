import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import worker from "../worker/src/index";
const configuredAllowedOrigin = readFileSync(
  new URL("../worker/wrangler.jsonc", import.meta.url),
  "utf8",
).match(/"ALLOWED_ORIGIN":\s*"([^"]+)"/)?.[1];
const env: any = {
  FIREBASE_PROJECT_ID: "rositanails",
  ALLOWED_ORIGIN: configuredAllowedOrigin,
};
describe("API access boundary", () => {
  it("rejects unauthenticated bookings", async () => {
    const response = await worker.fetch(
      new Request("https://api.invalid/appointments", {
        method: "POST",
        body: "{}",
      }),
      env,
    );
    expect(response.status).toBe(401);
  });
  it("rejects an untrusted browser origin before any database operation", async () => {
    const response = await worker.fetch(
      new Request("https://api.invalid/settings", {
        headers: { Origin: "https://malicious.invalid" },
      }),
      env,
    );
    expect(response.status).toBe(403);
  });
  it.each([
    "https://rositanails.firebaseapp.com",
    "https://rositanails.web.app",
  ])(
    "supports preflight for the configured Firebase origin %s",
    async (origin) => {
      const response = await worker.fetch(
        new Request("https://api.invalid/appointments", {
          method: "OPTIONS",
          headers: { Origin: origin },
        }),
        env,
      );
      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    },
  );
  it("makes authentication errors readable from the firebaseapp production domain", async () => {
    const origin = "https://rositanails.firebaseapp.com";
    const response = await worker.fetch(
      new Request("https://api.invalid/me", { headers: { Origin: origin } }),
      env,
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    expect(await response.json()).toMatchObject({
      error: "Iniciá sesión para continuar.",
    });
  });
  it("does not accept a forged session", async () => {
    const response = await worker.fetch(
      new Request("https://api.invalid/me", {
        headers: { Authorization: "Bearer forged" },
      }),
      env,
    );
    expect(response.status).toBe(401);
  });
});
