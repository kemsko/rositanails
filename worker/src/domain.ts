import { z } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const publicImage = z
  .string()
  .max(2048)
  .refine(
    (v) => v === "" || /^https:\/\/res\.cloudinary\.com\//.test(v),
    "Usá una imagen del negocio subida a Cloudinary.",
  )
  .optional();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const settingsSchema = z.object({
  logoUrl: publicImage,
  brand: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(160),
  whatsapp: z.string().regex(/^\d{8,15}$|^$/),
  address: z.string().trim().max(240),
  slots: z
    .array(time)
    .length(4)
    .refine((x) => new Set(x).size === 4, "Los horarios deben ser distintos."),
  openDays: z.array(z.number().int().min(0).max(6)).max(7),
  closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366),
  bookingEnabled: z.boolean(),
  services: z
    .array(
      z.object({
        imageUrl: publicImage,
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(200),
        price: z.number().min(0).max(100000),
        duration: z.number().int().min(15).max(300),
        active: z.boolean(),
      }),
    )
    .max(30)
    .refine(
      (x) => new Set(x.map((s) => s.id)).size === x.length,
      "Servicios repetidos.",
    ),
  confirmationTemplate: z.string().max(1000),
});
export type Settings = z.infer<typeof settingsSchema>;
export const initialSettings: Settings = {
  brand: "Rosita Nails",
  tagline: "Un detalle para vos. Un momento para consentirte.",
  whatsapp: "",
  address: "",
  slots: ["09:00", "11:00", "14:00", "16:00"],
  openDays: [1, 2, 3, 4, 5, 6],
  closedDates: [],
  bookingEnabled: false,
  services: [],
  confirmationTemplate:
    "Hola {nombre}, tu cita en Rosita está confirmada para el {fecha} a las {hora}. ¡Te esperamos!",
};
export const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: time,
  serviceId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]{8,24}$/)
    .refine(
      (v) => /^\d{8,15}$/.test(v.replace(/\D/g, "")),
      "Revisá el número de WhatsApp.",
    ),
  note: z.string().trim().max(500).default(""),
});
export type BookingInput = z.infer<typeof bookingSchema>;
export type Appointment = BookingInput & {
  id: string;
  uid: string;
  email: string;
  serviceName: string;
  price: number;
  duration: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  changes: number;
  createdAt: string;
  updatedAt: string;
};
export type Day = {
  appointments: Record<string, { id: string; duration: number }>;
};
export function startTime(date: string, slot: string): number {
  const value = Date.parse(`${date}T${slot}:00-06:00`);
  if (
    !Number.isFinite(value) ||
    new Date(value - 6 * 3600000).toISOString().slice(0, 10) !== date
  ) {
    throw new ApiError(400, "La fecha no es válida.");
  }
  return value;
}
export function assertBookable(
  settings: Settings,
  input: Pick<BookingInput, "date" | "slot">,
  now: number,
) {
  if (!settings.bookingEnabled)
    throw new ApiError(409, "Las reservas todavía no están habilitadas.");
  if (!settings.slots.includes(input.slot))
    throw new ApiError(400, "Horario no disponible.");
  const start = startTime(input.date, input.slot);
  if (start <= now || start > now + 180 * 86400000)
    throw new ApiError(
      400,
      "Elegí una fecha futura dentro de los próximos seis meses.",
    );
  const weekday = new Date(`${input.date}T12:00:00-06:00`).getUTCDay();
  if (
    !settings.openDays.includes(weekday) ||
    settings.closedDates.includes(input.date)
  )
    throw new ApiError(409, "Ese día no hay atención.");
}
export function assertCanMove(
  appointment: Appointment,
  uid: string,
  now: number,
) {
  if (appointment.uid !== uid)
    throw new ApiError(403, "No tenés acceso a esta cita.");
  if (!["pending", "confirmed"].includes(appointment.status))
    throw new ApiError(409, "Esta cita ya no admite cambios.");
  if (appointment.changes >= 1)
    throw new ApiError(409, "Ya usaste el único cambio de esta cita.");
  if (startTime(appointment.date, appointment.slot) - now < 24 * 3600000)
    throw new ApiError(
      409,
      "Los cambios requieren al menos 24 horas de anticipación.",
    );
}
const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function occupy(day: Day, slot: string, id: string, duration: number) {
  const other = Object.entries(day.appointments).filter(([, a]) => a.id !== id);
  if (
    other.length >= 4 ||
    other.some(
      ([s, a]) =>
        minutes(slot) < minutes(s) + a.duration &&
        minutes(s) < minutes(slot) + duration,
    )
  ) {
    throw new ApiError(409, "Ese horario ya está ocupado. Elegí otro.");
  }
  return {
    appointments: Object.fromEntries([...other, [slot, { id, duration }]]),
  } as Day;
}
export function release(day: Day, id: string): Day {
  return {
    appointments: Object.fromEntries(
      Object.entries(day.appointments).filter(([, x]) => x.id !== id),
    ),
  };
}
