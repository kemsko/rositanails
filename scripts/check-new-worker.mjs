import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const ROSITA_WORKER_NAME = "rosita-api";

// This first-deployment check only reads the exact new Worker target.
// It never reads, creates, renames, or updates the account's workers.dev subdomain.
export async function checkNewWorker({
  token,
  accountId,
  configuredAccountId,
  workerName = ROSITA_WORKER_NAME,
  fetchImpl = fetch,
}) {
  if (workerName !== ROSITA_WORKER_NAME) {
    throw new Error(
      "Este despliegue solo puede crear el Worker nuevo rosita-api.",
    );
  }
  if (typeof accountId !== "string" || !/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error(
      "Configurá un CLOUDFLARE_ACCOUNT_ID válido en GitHub Actions secrets.",
    );
  }
  if (configuredAccountId !== accountId) {
    throw new Error(
      "La cuenta de worker/wrangler.jsonc no coincide con CLOUDFLARE_ACCOUNT_ID. El despliegue queda detenido.",
    );
  }
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Falta CLOUDFLARE_API_TOKEN en GitHub Actions secrets.");
  }
  let response;
  try {
    response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${ROSITA_WORKER_NAME}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new Error(
      "No se pudo consultar el Worker nuevo. El despliegue queda detenido.",
    );
  }
  if (response.status === 404) return;
  if (response.status === 200) {
    throw new Error(
      "Ya existe un Worker llamado rosita-api. Se detuvo el despliegue para no sobrescribir ningún recurso existente.",
    );
  }
  throw new Error(
    `Cloudflare respondió ${response.status}. No se pudo comprobar que rosita-api sea nuevo; el despliegue queda detenido.`,
  );
}

async function main() {
  const configuration = await readFile(
    new URL("../worker/wrangler.jsonc", import.meta.url),
    "utf8",
  );
  const configuredName = configuration.match(
    /^\s*"name"\s*:\s*"([^"]+)"/m,
  )?.[1];
  await checkNewWorker({
    token: process.env.CLOUDFLARE_API_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    configuredAccountId: configuration.match(
      /^\s*"account_id"\s*:\s*"([^"]+)"/m,
    )?.[1],
    workerName: configuredName ?? "",
  });
  console.log(
    "Cloudflare confirmó que rosita-api no existe. Se puede continuar con su primer despliegue.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    // Never print provider bodies, request headers, or credentials.
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo comprobar el Worker nuevo. El despliegue queda detenido.",
    );
    process.exitCode = 1;
  }
}
