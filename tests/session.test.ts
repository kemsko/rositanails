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
  vi.stubEnv("VITE_FRONTEND_ONLY", "false");
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

describe("published frontend before reservations launch", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FRONTEND_ONLY", "true");
    vi.stubEnv("VITE_API_URL", "");
  });

  it("shows only the real brand settings and keeps bookings closed without any API request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const api = await import("../src/api");
    const settings = await api.getSettings();
    expect(api.demo).toBe(false);
    expect(api.frontendOnly).toBe(true);
    expect(settings.brand).toBe("Rosita Nails");
    expect(settings.bookingEnabled).toBe(false);
    expect(settings.services).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not create a local account or start Google verification before account access opens", async () => {
    const api = await import("../src/api");
    const session = vi.fn();
    const error = vi.fn();
    api.watchSession(session, error);
    expect(session.mock.calls).toEqual([[null]]);
    expect(mocks.observer).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
    await expect(api.login()).rejects.toThrow("estarán disponibles pronto");
    expect(mocks.popup).not.toHaveBeenCalled();
  });

  it("publishes a visible reservation status with disabled entry points and no demo accounts", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { default: App } = await import("../src/App");
    const html = renderToStaticMarkup(createElement(App));
    expect(html).toContain("Las reservas en línea estarán disponibles pronto");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).not.toContain("Mis citas");
    expect(html).not.toContain("Acceso del personal");
    expect(html).not.toContain("Demostración");
    expect(html).not.toContain("Ingresar");
  });

  it("rejects reservation writes without using demo storage or the API", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const api = await import("../src/api");
    await expect(
      api.book({
        date: "2026-12-01",
        slot: "09:00",
        serviceId: "gel",
        name: "Clienta",
        phone: "55555555",
        note: "",
      }),
    ).rejects.toThrow("estarán disponibles pronto");
    expect(fetch).not.toHaveBeenCalled();
  });
});
