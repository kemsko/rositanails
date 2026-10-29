import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import worker, { signature } from "../worker/src/index";
import { cloudinaryUploadParameters } from "../worker/src/cloudinary";
import { Firestore } from "../worker/src/firestore";

const env: any = {
  FIREBASE_PROJECT_ID: "demo",
  STAFF_UIDS: "staff",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
};
let uploaded: FormData | undefined;

beforeEach(() => {
  uploaded = undefined;
  vi.spyOn(Firestore.prototype, "get").mockResolvedValue({
    id: "appointment-1",
    uid: "owner",
    status: "pending",
  } as any);
  vi.spyOn(Firestore.prototype, "query").mockResolvedValue([]);
  vi.spyOn(Firestore.prototype, "put").mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) => {
      uploaded = options.body as FormData;
      return Response.json({
        public_id: uploaded.get("public_id"),
        format: "png",
        secure_url:
          "https://res.cloudinary.com/test-cloud/image/upload/logo.png",
      });
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function imageRequest(path: string, uid: string) {
  const form = new FormData();
  form.set(
    "file",
    new File(["png test data"], "test.png", { type: "image/png" }),
  );
  // Browser-supplied folder and ID values must never override server routing.
  form.set("asset_folder", "another-project");
  form.set("public_id", "another-project/photo");
  return new Request(`https://api.invalid${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${uid}` },
    body: form,
  });
}

describe("Cloudinary project isolation", () => {
  it.each([
    ["/branding/upload", "staff", "upload"],
    ["/appointments/appointment-1/photos", "owner", "authenticated"],
  ])("places %s in rosita and signs its folder", async (path, uid, type) => {
    const response = await worker.fetch(imageRequest(path, uid), env);
    expect(response.status).toBe(201);
    expect(uploaded?.get("asset_folder")).toBe("ROSITA");
    expect(uploaded?.get("public_id")).toMatch(/^ROSITA\//);
    expect(uploaded?.get("type")).toBe(type);
    const signedParams = Object.fromEntries(
      Array.from(uploaded!.entries()).filter(
        ([key]) => !["file", "api_key", "signature"].includes(key),
      ),
    ) as Record<string, string>;
    expect(uploaded?.get("signature")).toBe(
      await signature(signedParams, env.CLOUDINARY_API_SECRET),
    );
  });

  it("keeps legacy fixed-folder uploads under the rosita public ID path", async () => {
    const response = await worker.fetch(
      imageRequest("/branding/upload", "staff"),
      {
        ...env,
        CLOUDINARY_FOLDER_MODE: "fixed",
      },
    );
    expect(response.status).toBe(201);
    expect(uploaded?.has("asset_folder")).toBe(false);
    expect(uploaded?.get("public_id")).toMatch(/^ROSITA\/branding\//);
  });

  it.each(["another-project/photo", "ROSITA/../photo", "ROSITA//photo"])(
    "refuses a public ID outside Rosita's namespace: %s",
    (publicId) => {
      expect(() => cloudinaryUploadParameters(publicId, "upload")).toThrow(
        "dentro de Rosita",
      );
    },
  );

  it("fails instead of silently uploading to a root folder for an unknown mode", () => {
    expect(() =>
      cloudinaryUploadParameters("ROSITA/photo", "upload", "incorrect-mode"),
    ).toThrow("modo de carpetas");
  });
});
