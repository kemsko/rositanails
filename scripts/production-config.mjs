import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";

export function productionConfig(
  env = loadEnv("production", process.cwd(), "VITE_"),
) {
  if (env.VITE_DEMO_MODE && env.VITE_DEMO_MODE !== "false") {
    throw new Error("La publicación real requiere VITE_DEMO_MODE=false.");
  }
  if (env.VITE_FRONTEND_ONLY === "true") {
    return {
      apiUrl: null,
      origin: "https://rositanails.firebaseapp.com",
      frontendOnly: true,
    };
  }
  if (!env.VITE_API_URL?.trim()) {
    throw new Error(
      "Falta la URL de la API real. Configurá ROSITA_API_URL en las variables de GitHub Actions antes de publicar.",
    );
  }
  let url;
  try {
    url = new URL(env.VITE_API_URL.trim());
  } catch {
    throw new Error("La URL de la API real no es válida.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.port && url.port !== "443") ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") ||
    url.hostname.endsWith(".invalid") ||
    url.hostname.endsWith(".example") ||
    url.hostname === "example.com" ||
    url.hostname.endsWith(".example.com")
  ) {
    throw new Error(
      "Usá el origen HTTPS público de la API, sin rutas, credenciales ni valores de ejemplo.",
    );
  }
  return { apiUrl: url.origin, origin: "https://rositanails.firebaseapp.com" };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const config = productionConfig();
  console.log(
    config.frontendOnly
      ? "Publicación de la web real: reservas pendientes de conexión."
      : `Modo real comprobado. API: ${config.apiUrl}`,
  );
}
