import { ApiError } from "./domain";

export const CLOUDINARY_ROOT_FOLDER = "ROSITA";

// In dynamic folder mode the public ID does not determine Media Library placement.
// Keep this folder fixed on the server so callers cannot mix Rosita's uploads
// with other projects in the same Cloudinary environment.
export function cloudinaryUploadParameters(
  publicId: string,
  type: "upload" | "authenticated",
  folderMode = "dynamic",
): Record<string, string> {
  const segments = publicId.split("/");
  if (
    segments[0] !== CLOUDINARY_ROOT_FOLDER ||
    segments.length < 2 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new ApiError(500, "La imagen debe guardarse dentro de Rosita.");
  }
  if (folderMode !== "dynamic" && folderMode !== "fixed") {
    throw new ApiError(503, "Revisá el modo de carpetas de Cloudinary.");
  }
  return {
    public_id: publicId,
    ...(folderMode === "dynamic"
      ? { asset_folder: CLOUDINARY_ROOT_FOLDER }
      : {}),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type,
    overwrite: "false",
  };
}
