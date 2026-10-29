// Called only by the explicit deployment workflow. Never log credentials.
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId || !/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error(
    "Configurá CLOUDFLARE_API_TOKEN y un CLOUDFLARE_ACCOUNT_ID válido en GitHub Actions secrets.",
  );
}
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`;
async function request(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (method === "GET" && response.status === 404) return null;
  if (!response.ok)
    throw new Error(
      `Cloudflare respondió ${response.status}. Revisá la cuenta y el permiso Workers Scripts Edit del token.`,
    );
  const data = await response.json();
  if (!data.success)
    throw new Error(
      "Cloudflare no pudo preparar workers.dev. Revisá la configuración de Workers en tu cuenta.",
    );
  return data.result;
}
const current = await request("GET");
if (current?.subdomain) {
  console.log("Se conserva el subdominio workers.dev existente de la cuenta.");
} else {
  await request("PUT", {
    subdomain: `rosita-${accountId.slice(-8)}`,
  });
  console.log(
    "Subdominio workers.dev preparado para el nuevo Worker de Rosita.",
  );
}
