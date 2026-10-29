import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
const configuration = pathToFileURL(
  resolve("scripts/production-config.mjs"),
).href;
const preflight = pathToFileURL(
  resolve("scripts/verify-production-api.mjs"),
).href;
function run(body: string) {
  return execFileSync(process.execPath, ["--input-type=module", "-e", body], {
    encoding: "utf8",
    env: {},
  }).trim();
}
describe("production deployment configuration", () => {
  it.each([
    {
      VITE_DEMO_MODE: "true",
      VITE_API_URL: "https://rosita-api.example.workers.dev",
    },
    { VITE_DEMO_MODE: "false" },
    { VITE_API_URL: "http://localhost:8787" },
    { VITE_API_URL: "https://127.0.0.1" },
    { VITE_API_URL: "https://user:password@example.workers.dev" },
    { VITE_API_URL: "https://example.com" },
  ])("rejects an incomplete or demo configuration: %j", (env) => {
    const output = run(
      `const {productionConfig}=await import(${JSON.stringify(configuration)});try{productionConfig(${JSON.stringify(env)});console.log('accepted')}catch{console.log('rejected')}`,
    );
    expect(output).toBe("rejected");
  });
  it("allows explicit real frontend-only publishing without an API", () => {
    const output = run(
      `const {productionConfig}=await import(${JSON.stringify(configuration)});console.log(JSON.stringify(productionConfig({VITE_DEMO_MODE:'false',VITE_FRONTEND_ONLY:'true'})))`,
    );
    expect(JSON.parse(output)).toEqual({
      apiUrl: null,
      origin: "https://rositanails.firebaseapp.com",
      frontendOnly: true,
    });
  });
  it("still refuses demo when frontend-only publication is selected", () => {
    expect(
      run(
        `const {productionConfig}=await import(${JSON.stringify(configuration)});try{productionConfig({VITE_DEMO_MODE:'true',VITE_FRONTEND_ONLY:'true'});console.log('accepted')}catch{console.log('rejected')}`,
      ),
    ).toBe("rejected");
  });
  it("accepts the real HTTPS API with demo disabled", () => {
    const output = run(
      `const {productionConfig}=await import(${JSON.stringify(configuration)});console.log(JSON.stringify(productionConfig({VITE_DEMO_MODE:'false',VITE_API_URL:'https://rosita-api.example.workers.dev/'})))`,
    );
    expect(JSON.parse(output)).toEqual({
      apiUrl: "https://rosita-api.example.workers.dev",
      origin: "https://rositanails.firebaseapp.com",
    });
  });
});
describe("real API preflight", () => {
  it("does not call a Worker during frontend-only publishing", () => {
    const output = run(
      `const {verifyProductionApi}=await import(${JSON.stringify(preflight)});const result=await verifyProductionApi({frontendOnly:true,apiUrl:null},async()=>{throw Error('Worker must not be called');});console.log(JSON.stringify(result))`,
    );
    expect(JSON.parse(output)).toEqual({
      bookingsOpen: false,
      frontendOnly: true,
    });
  });

  it.each([
    { status: 503, cors: true, expectation: "rejected" },
    { status: 200, cors: false, expectation: "rejected" },
    { status: 200, cors: true, expectation: "accepted" },
  ])("verifies Firestore-backed settings and CORS: %j", (example) => {
    const code = `const {verifyProductionApi}=await import(${JSON.stringify(preflight)});try{const result=await verifyProductionApi({apiUrl:'https://api.example.workers.dev',origin:'https://rositanails.firebaseapp.com'},async()=>Response.json({brand:'Rosita',slots:['09:00','11:00','14:00','16:00'],services:[],bookingEnabled:false},{status:${example.status},headers:${JSON.stringify(example.cors ? { "Access-Control-Allow-Origin": "https://rositanails.firebaseapp.com" } : {})}}));console.log('accepted');if(result.bookingsOpen)throw Error('Configuration has no active services');}catch{console.log('rejected')}`;
    expect(run(code)).toBe(example.expectation);
  });
});
