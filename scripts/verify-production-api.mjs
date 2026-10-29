import { pathToFileURL } from "node:url";
import { productionConfig } from "./production-config.mjs";

export async function verifyProductionApi(config, fetchImpl = fetch) {
  if (config.frontendOnly) return { bookingsOpen: false, frontendOnly: true };
  const response = await fetchImpl(`${config.apiUrl}/settings`, {
    headers: { Origin: config.origin },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      `La API de reservas respondió ${response.status}; no se publicará la web como operativa.`,
    );
  if (response.headers.get("Access-Control-Allow-Origin") !== config.origin) {
    throw new Error(
      "La API no permite el dominio rositanails.firebaseapp.com. Corregí ALLOWED_ORIGIN del Worker.",
    );
  }
  const settings = await response.json();
  if (
    typeof settings.brand !== "string" ||
    !Array.isArray(settings.slots) ||
    settings.slots.length !== 4 ||
    !Array.isArray(settings.services) ||
    typeof settings.bookingEnabled !== "boolean"
  ) {
    throw new Error("La API no devolvió una configuración válida del negocio.");
  }
  return {
    bookingsOpen:
      settings.bookingEnabled && settings.services.some((s) => s.active),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await verifyProductionApi(productionConfig());
  if (result.frontendOnly) {
    console.log(
      "Publicación solo de la web; no se consultó ni se modificó ningún Worker. Las reservas permanecen deshabilitadas.",
    );
  } else {
    console.log("Conexión real y acceso desde firebaseapp.com comprobados.");
    console.log(
      result.bookingsOpen
        ? "El negocio tiene reservas habilitadas y servicios activos."
        : "Publicación para configurar el negocio: el personal aún debe cargar servicios o habilitar reservas.",
    );
  }
}
