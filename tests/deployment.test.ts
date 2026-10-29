import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function simulate(existing: boolean) {
  const scriptUrl = pathToFileURL(
    resolve("scripts/bootstrap-cloudflare.mjs"),
  ).href;
  const code = `
    const calls = [];
    globalThis.fetch = async (_url, options) => {
      calls.push({method: options.method, body: options.body ? JSON.parse(options.body) : null});
      if(options.method === 'GET') return ${existing ? "Response.json({success:true,result:{subdomain:'keep-existing-domain'}})" : "new Response(null,{status:404})"};
      return Response.json({success:true,result:{subdomain:'new-domain'}});
    };
    await import(${JSON.stringify(scriptUrl)});
    console.log(JSON.stringify(calls));
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    {
      env: {
        CLOUDFLARE_API_TOKEN: "test-token-never-print",
        CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      },
      encoding: "utf8",
    },
  );
  return { output, calls: JSON.parse(output.trim().split("\n").at(-1)!) };
}
describe("deployment bootstrap", () => {
  it("never renames an existing workers.dev subdomain", () => {
    const { calls } = simulate(true);
    expect(calls).toEqual([{ method: "GET", body: null }]);
  });
  it("only creates a subdomain when no existing one was found", () => {
    const { calls, output } = simulate(false);
    expect(calls).toEqual([
      { method: "GET", body: null },
      { method: "PUT", body: { subdomain: "rosita-aaaaaaaa" } },
    ]);
    expect(output).not.toContain("test-token-never-print");
  });
});
