import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { firebaseConfig } from "./firebase-config";
import {
  type Appointment,
  type BookingInput,
  type Settings,
  initialSettings,
  assertBookable,
  assertCanMove,
  occupy,
  release,
} from "../worker/src/domain";
export type { Appointment, BookingInput, Settings };
export type Me = { uid: string; email: string; staff: boolean };
export type Photo = { id: string; kind: "reference" | "result" };
export const demo = import.meta.env.VITE_DEMO_MODE === "true";
export const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const auth = getAuth(initializeApp(firebaseConfig));
const demoMe: Me = {
  uid: "demo-client",
  email: "clienta@example.invalid",
  staff: false,
};
let currentDemo: Me | null = null;
let listener: ((user: Me | null) => void) | undefined;
const tomorrow = () => {
  const d = new Date(Date.now() + 86400000 * 2);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
};
const demoSettings: Settings = {
  ...initialSettings,
  bookingEnabled: true,
  services: [
    {
      id: "gel",
      name: "Manicura en gel",
      description:
        "Color impecable, acabado brillante y ese detalle que te hace sonreír.",
      price: 120,
      duration: 90,
      active: true,
    },
    {
      id: "acrylic",
      name: "Uñas acrílicas",
      description:
        "La forma y el largo que van con vos. Una nueva versión de tus manos.",
      price: 180,
      duration: 120,
      active: true,
    },
    {
      id: "art",
      name: "Nail art",
      description:
        "Detalles delicados y diseños que cuentan un poquito de tu estilo.",
      price: 150,
      duration: 90,
      active: true,
    },
  ],
};
function demoData(): { settings: Settings; appointments: Appointment[] } {
  try {
    const data = JSON.parse(localStorage.getItem("rosita-demo-v1") || "null");
    if (data?.settings && Array.isArray(data.appointments)) return data;
  } catch {
    /* Invalid local demo data can be reset. */
  }
  return { settings: demoSettings, appointments: [] };
}
function saveDemo(data: ReturnType<typeof demoData>) {
  localStorage.setItem("rosita-demo-v1", JSON.stringify(data));
}
export function watchSession(callback: (user: Me | null) => void) {
  if (demo) {
    listener = callback;
    callback(currentDemo);
    return () => {
      listener = undefined;
    };
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);
    try {
      callback(await request<Me>("/me"));
    } catch {
      callback(null);
    }
  });
}
export async function login(staff = false) {
  if (demo) {
    currentDemo = { ...demoMe, staff };
    listener?.(currentDemo);
    return;
  }
  await signInWithPopup(auth, new GoogleAuthProvider());
}
export async function logout() {
  if (demo) {
    currentDemo = null;
    listener?.(null);
  } else await signOut(auth);
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiUrl)
    throw new Error(
      "Todavía estamos preparando las reservas en línea. Intentá más tarde.",
    );
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No pudimos completar la solicitud.");
  return data as T;
}
export const getSettings = async () =>
  demo ? demoData().settings : request<Settings>("/settings");
export type AppointmentPage = {
  items: Appointment[];
  nextCursor: string | null;
};
export const getAppointments = async (
  cursor?: string,
): Promise<AppointmentPage> =>
  demo
    ? {
        items: demoData().appointments.filter(
          (x) => currentDemo?.staff || x.uid === currentDemo?.uid,
        ),
        nextCursor: null,
      }
    : request<AppointmentPage>(
        `/appointments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
export async function availability(date: string, serviceId: string) {
  if (!demo)
    return request<{ slots: { slot: string; available: boolean }[] }>(
      `/availability?date=${date}&serviceId=${serviceId}`,
    );
  const data = demoData();
  const duration =
    data.settings.services.find((x) => x.id === serviceId)?.duration ?? 60;
  return {
    slots: data.settings.slots.map((slot) => {
      try {
        assertBookable(data.settings, { date, slot }, Date.now());
        occupy(
          {
            appointments: Object.fromEntries(
              data.appointments
                .filter((x) => x.date === date && x.status !== "cancelled")
                .map((x) => [x.slot, { id: x.id, duration: x.duration }]),
            ),
          },
          slot,
          "new",
          duration,
        );
        return { slot, available: true };
      } catch {
        return { slot, available: false };
      }
    }),
  };
}
export async function book(input: BookingInput) {
  if (!demo)
    return request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  if (!currentDemo) throw new Error("Iniciá sesión primero.");
  const data = demoData();
  assertBookable(data.settings, input, Date.now());
  const slots = await availability(input.date, input.serviceId);
  if (!slots.slots.find((x) => x.slot === input.slot)?.available)
    throw new Error("Ese horario ya no está disponible.");
  const service = data.settings.services.find((x) => x.id === input.serviceId)!;
  const appointment: Appointment = {
    ...input,
    id: crypto.randomUUID(),
    uid: currentDemo.uid,
    email: currentDemo.email,
    serviceName: service.name,
    price: service.price,
    duration: service.duration,
    status: "pending",
    changes: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.appointments.push(appointment);
  saveDemo(data);
  return appointment;
}
export async function move(id: string, date: string, slot: string) {
  if (!demo)
    return request<Appointment>(`/appointments/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ date, slot }),
    });
  const data = demoData();
  const appointment = data.appointments.find((x) => x.id === id)!;
  assertCanMove(appointment, currentDemo!.uid, Date.now());
  assertBookable(data.settings, { date, slot }, Date.now());
  if (Date.parse(`${date}T${slot}:00-06:00`) - Date.now() < 86400000)
    throw new Error(
      "El nuevo horario también debe tener 24 horas de anticipación.",
    );
  if (appointment.date === date && appointment.slot === slot)
    throw new Error("Elegí otro horario.");
  const day = {
    appointments: Object.fromEntries(
      data.appointments
        .filter((x) => x.date === date && x.status !== "cancelled")
        .map((x) => [x.slot, { id: x.id, duration: x.duration }]),
    ),
  };
  occupy(release(day, id), slot, id, appointment.duration);
  Object.assign(appointment, { date, slot, changes: 1, status: "pending" });
  saveDemo(data);
  return appointment;
}
export async function setStatus(id: string, status: Appointment["status"]) {
  if (!demo)
    return request<Appointment>(`/appointments/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  if (!currentDemo?.staff)
    throw new Error("Solo el personal puede cambiar el estado.");
  const data = demoData();
  const appointment = data.appointments.find((x) => x.id === id)!;
  if (!["pending", "confirmed"].includes(appointment.status))
    throw new Error("La cita ya está cerrada.");
  if (status === "completed" && appointment.status !== "confirmed")
    throw new Error("Primero confirmá la cita.");
  appointment.status = status;
  saveDemo(data);
  return appointment;
}
export async function updateSettings(settings: Settings) {
  if (!demo)
    return request<Settings>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  if (!currentDemo?.staff)
    throw new Error("Solo el personal puede editar la configuración.");
  const data = demoData();
  data.settings = settings;
  saveDemo(data);
  return settings;
}
export const getPhotos = (id: string) =>
  demo ? Promise.resolve([]) : request<Photo[]>(`/appointments/${id}/photos`);
export async function uploadPhoto(
  id: string,
  file: File,
  kind: "reference" | "result",
) {
  if (demo)
    throw new Error(
      "Las fotos se habilitarán al conectar Cloudinary. La demostración no sube archivos.",
    );
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  return request<Photo>(`/appointments/${id}/photos?kind=${kind}`, {
    method: "POST",
    body: form,
  });
}
export async function photoUrl(id: string) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${apiUrl}/photos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("No se pudo abrir la foto.");
  return URL.createObjectURL(await response.blob());
}
export const defaultDate = tomorrow;

export async function uploadPublic(file: File): Promise<string> {
  if (demo)
    throw new Error(
      "Las imágenes del negocio se habilitan al conectar Cloudinary.",
    );
  const form = new FormData();
  form.set("file", file);
  const result = await request<{ url: string }>("/branding/upload", {
    method: "POST",
    body: form,
  });
  return result.url;
}
