import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { getIdToken: async () => "test-google-token" } },
  observer: undefined as undefined | ((user: unknown) => Promise<void>),
  unsubscribe: vi.fn(),
  popup: vi.fn(async () => undefined),
}));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn() }));
vi.mock("firebase/auth", () => ({
  getAuth: () => mocks.auth,
  GoogleAuthProvider: class {},
  signInWithPopup: mocks.popup,
  signOut: vi.fn(),
  onAuthStateChanged: (_auth: unknown, observer: typeof mocks.observer) => {
    mocks.observer = observer;
    return mocks.unsubscribe;
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.observer = undefined;
  vi.stubEnv("VITE_DEMO_MODE", "false");
  vi.stubEnv("VITE_API_URL", "https://rosita-api.example.workers.dev");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("real Google session verification", () => {
  it("reports a visible error when Google succeeds but the API cannot verify access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const api = await import("../src/api");
    const session = vi.fn();
    const error = vi.fn();
    api.watchSession(session, error);
    await api.login();
    await mocks.observer!({ uid: "google-user" });
    expect(mocks.popup).toHaveBeenCalledOnce();
    expect(session.mock.calls).toEqual([[null]]);
    expect(error).toHaveBeenCalledWith(
      "Tu cuenta de Google se conectó, pero no pudimos verificar tu acceso a Rosita. Actualizá la página para reintentar.",
    );
    expect(api.demo).toBe(false);
  });

  it("does not create a local session when the real API URL is missing", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const api = await import("../src/api");
    const session = vi.fn();
    const error = vi.fn();
    api.watchSession(session, error);
    await mocks.observer!({ uid: "google-user" });
    expect(session.mock.calls).toEqual([[null]]);
    expect(error).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("only exposes the role returned by the API after verification", async () => {
    const verified = {
      uid: "google-user",
      email: "real@example.invalid",
      staff: false,
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(verified));
    vi.stubGlobal("fetch", fetch);
    const api = await import("../src/api");
    const session = vi.fn();
    const error = vi.fn();
    api.watchSession(session, error);
    await mocks.observer!({ uid: "google-user", staff: true });
    expect(session.mock.calls).toEqual([[null], [verified]]);
    expect(error).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "https://rosita-api.example.workers.dev/me",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it("does not restore a stale authorized session after logout", async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            respond = resolve;
          }),
      ),
    );
    const api = await import("../src/api");
    const session = vi.fn();
    const error = vi.fn();
    api.watchSession(session, error);
    const pending = mocks.observer!({ uid: "google-user" });
    await vi.waitFor(() => expect(respond).toBeTypeOf("function"));
    await mocks.observer!(null);
    respond(
      Response.json({
        uid: "google-user",
        email: "real@example.invalid",
        staff: true,
      }),
    );
    await pending;
    expect(session.mock.calls).toEqual([[null], [null]]);
    expect(error).not.toHaveBeenCalled();
  });
});
