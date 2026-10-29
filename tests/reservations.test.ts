import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("jose", async (original) => {
  const actual = await original<typeof import("jose")>();
  return {
    ...actual,
    jwtVerify: async (token: string) => ({
      payload: {
        sub: token,
        email: `${token}@example.invalid`,
        email_verified: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    }),
  };
});
import worker from "../worker/src/index";
import { Firestore, decode } from "../worker/src/firestore";
import { initialSettings } from "../worker/src/domain";
const env: any = {
  FIREBASE_PROJECT_ID: "demo",
  ALLOWED_ORIGIN: "https://rosita.invalid",
  STAFF_UIDS: "staff",
};
let documents: Map<string, unknown>;
function request(
  path: string,
  uid: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
) {
  return worker.fetch(
    new Request(`https://api.invalid${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${uid}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
  documents = new Map([
    [
      "settings/public",
      {
        ...initialSettings,
        bookingEnabled: true,
        openDays: [0, 1, 2, 3, 4, 5, 6],
        services: [
          {
            id: "gel",
            name: "Gel",
            price: 100,
            duration: 90,
            description: "",
            active: true,
          },
        ],
      },
    ],
  ]);
  const snapshots = new Map<string, Map<string, unknown>>();
  let revision = 0;
  let txId = 0;
  vi.spyOn(Firestore.prototype, "get").mockImplementation(
    async function (path, tx) {
      return structuredClone(
        (tx ? snapshots.get(tx)! : documents).get(path) ?? null,
      ) as any;
    },
  );
  vi.spyOn(Firestore.prototype, "transact").mockImplementation(async function (
    run: any,
  ) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const tx = `tx-${txId++}`;
      const seen = revision;
      snapshots.set(tx, structuredClone(documents));
      const { writes, result } = await run(tx);
      if (seen !== revision) continue;
      for (const write of writes) {
        const path = write.update.name.split("/documents/")[1];
        documents.set(
          path,
          decode({ mapValue: { fields: write.update.fields } }),
        );
      }
      revision++;
      return result;
    }
    throw new Error("transaction contention");
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const input = {
  date: "2026-11-03",
  slot: "09:00",
  serviceId: "gel",
  name: "Clienta",
  phone: "55555555",
  note: "",
};
describe("reservation API with transactional storage", () => {
  it("allows only one winner for simultaneous requests to the same slot", async () => {
    const responses = await Promise.all([
      request("/appointments", "a", input),
      request("/appointments", "b", input),
    ]);
    expect(responses.map((x) => x.status).sort()).toEqual([201, 409]);
    expect(
      [...documents.keys()].filter((x) => x.startsWith("appointments/")),
    ).toHaveLength(1);
    expect(
      [...documents.keys()].filter((x) => x.startsWith("events/")),
    ).toHaveLength(1);
  });
  it("does not allow the client to set staff-only settings", async () => {
    expect((await request("/settings", "client", {}, "PUT")).status).toBe(403);
  });
  it("hides another client appointment and its photos", async () => {
    const created = (await (
      await request("/appointments", "owner", input)
    ).json()) as any;
    expect((await request(`/appointments/${created.id}`, "other")).status).toBe(
      404,
    );
    expect(
      (await request(`/appointments/${created.id}/photos`, "other")).status,
    ).toBe(404);
    expect(
      (
        await request(`/appointments/${created.id}/move`, "other", {
          date: "2026-11-04",
          slot: "11:00",
        })
      ).status,
    ).toBe(404);
  });
  it("cannot confirm an appointment as its owner", async () => {
    const created = (await (
      await request("/appointments", "owner", input)
    ).json()) as any;
    expect(
      (
        await request(`/appointments/${created.id}/status`, "owner", {
          status: "confirmed",
        })
      ).status,
    ).toBe(403);
  });
  it("moves atomically, frees the old day, returns to pending, and refuses a second move", async () => {
    const created = (await (
      await request("/appointments", "owner", input)
    ).json()) as any;
    expect(
      (
        await request(`/appointments/${created.id}/status`, "staff", {
          status: "confirmed",
        })
      ).status,
    ).toBe(200);
    const moved = await request(`/appointments/${created.id}/move`, "owner", {
      date: "2026-11-04",
      slot: "11:00",
    });
    expect(moved.status).toBe(200);
    expect(await moved.json()).toMatchObject({ changes: 1, status: "pending" });
    expect(documents.get("days/2026-11-03")).toEqual({ appointments: {} });
    expect(
      (
        await request(`/appointments/${created.id}/move`, "owner", {
          date: "2026-11-05",
          slot: "14:00",
        })
      ).status,
    ).toBe(409);
  });
  it("rejects forged price and owner fields by constructing those fields server side", async () => {
    const response = await request("/appointments", "owner", {
      ...input,
      price: 0,
      uid: "someone-else",
      status: "confirmed",
    });
    expect(await response.json()).toMatchObject({
      uid: "owner",
      price: 100,
      status: "pending",
    });
  });
});
