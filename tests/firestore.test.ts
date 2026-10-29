import { describe, it, expect, vi, afterEach } from "vitest";
import { encode, decode, Firestore } from "../worker/src/firestore";
import { ApiError } from "../worker/src/domain";
afterEach(() => vi.restoreAllMocks());
describe("Firestore transactions", () => {
  it("retries an aborted commit and reads the winning booking before trying again", async () => {
    const db = new Firestore({
      FIREBASE_PROJECT_ID: "demo",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
    });
    let commits = 0;
    const call = vi.spyOn(db, "call").mockImplementation(async (path) => {
      if (path === ":beginTransaction") return { transaction: `tx-${commits}` };
      if (path === ":commit" && commits++ === 0)
        throw new ApiError(409, "La agenda cambió; volvé a intentar.");
      return {};
    });
    let reads = 0;
    await expect(
      db.transact(async () => {
        reads++;
        return { writes: [], result: "saved" };
      }),
    ).resolves.toBe("saved");
    expect(reads).toBe(2);
    expect(call.mock.calls.some(([path]) => path === ":rollback")).toBe(true);
  });
  it("never retries an authorization failure", async () => {
    const db = new Firestore({
      FIREBASE_PROJECT_ID: "demo",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
    });
    vi.spyOn(db, "call").mockResolvedValue({ transaction: "tx" });
    let attempts = 0;
    await expect(
      db.transact(async () => {
        attempts++;
        throw new ApiError(403, "forbidden");
      }),
    ).rejects.toThrow("forbidden");
    expect(attempts).toBe(1);
  });
  it("round trips nested slot data including booleans and empty arrays", () => {
    const data = {
      appointments: { "09:00": { id: "x", duration: 90 } },
      enabled: false,
      price: 12.5,
      empty: [],
      nothing: null,
    };
    expect(decode(encode(data))).toEqual(data);
  });
});
