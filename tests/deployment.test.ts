import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function simulate(
  status: number,
  options: {
    accountId?: string;
    configuredAccountId?: string;
    workerName?: string;
    token?: string;
    networkFailure?: boolean;
  } = {},
) {
  const scriptUrl = pathToFileURL(resolve("scripts/check-new-worker.mjs")).href;
  const code = `
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({url,method:options.method});
      if (${options.networkFailure === true}) throw new Error("failure with test-token-never-print");
      return new Response(null,{status:${status}});
    };
    const {checkNewWorker} = await import(${JSON.stringify(scriptUrl)});
    let error = null;
    try {
      await checkNewWorker({
        token:${JSON.stringify(options.token ?? "test-token-never-print")},
        accountId:${JSON.stringify(options.accountId ?? "a".repeat(32))},
        configuredAccountId:${JSON.stringify(options.configuredAccountId ?? "a".repeat(32))},
        workerName:${JSON.stringify(options.workerName ?? "rosita-api")},
        fetchImpl,
      });
    } catch (failure) { error = failure.message; }
    console.log(JSON.stringify({calls,error}));
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    { env: {}, encoding: "utf8" },
  );
  return { output, ...JSON.parse(output.trim()) } as {
    output: string;
    calls: { url: string; method: string }[];
    error: string | null;
  };
}

describe("first deployment protects existing Cloudflare resources", () => {
  it("allows only a missing rosita-api target and never consults the account subdomain", () => {
    const { calls, error } = simulate(404);
    expect(error).toBeNull();
    expect(calls).toEqual([
      {
        method: "GET",
        url: `https://api.cloudflare.com/client/v4/accounts/${"a".repeat(32)}/workers/scripts/rosita-api`,
      },
    ]);
    expect(calls.some(({ url }) => url.includes("subdomain"))).toBe(false);
  });

  it("stops if rosita-api already exists instead of overwriting it", () => {
    const { calls, error } = simulate(200);
    expect(error).toContain("Ya existe un Worker llamado rosita-api");
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("GET");
  });

  it.each([401, 403, 429, 500])(
    "stops on HTTP %s without changing anything",
    (status) => {
      const { calls, error, output } = simulate(status);
      expect(error).toContain(`Cloudflare respondió ${status}`);
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("GET");
      expect(output).not.toContain("test-token-never-print");
    },
  );

  it("refuses to inspect another Worker", () => {
    const { calls, error } = simulate(404, { workerName: "another-project" });
    expect(error).toContain("solo puede crear el Worker nuevo rosita-api");
    expect(calls).toEqual([]);
  });

  it.each(["", "bad-account", `${"a".repeat(32)}/other`])(
    "rejects an invalid Account ID before a network request: %s",
    (accountId) => {
      const { calls, error } = simulate(404, { accountId });
      expect(error).toContain("CLOUDFLARE_ACCOUNT_ID válido");
      expect(calls).toEqual([]);
    },
  );

  it.each(["", "b".repeat(32)])(
    "refuses missing or different Wrangler account configuration before network access: %s",
    (configuredAccountId) => {
      const { calls, error } = simulate(404, { configuredAccountId });
      expect(error).toContain("no coincide con CLOUDFLARE_ACCOUNT_ID");
      expect(calls).toEqual([]);
    },
  );

  it("does not expose credentials from a failed network request", () => {
    const { error, output } = simulate(404, { networkFailure: true });
    expect(error).toContain("No se pudo consultar el Worker nuevo");
    expect(output).not.toContain("test-token-never-print");
  });

  it("requires a token without logging it", () => {
    const { calls, error } = simulate(404, { token: "" });
    expect(error).toContain("Falta CLOUDFLARE_API_TOKEN");
    expect(calls).toEqual([]);
  });
});
