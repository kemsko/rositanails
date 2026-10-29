import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Flower2,
  Heart,
  ImagePlus,
  LogOut,
  Menu,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import * as api from "./api";
import {
  initialSettings,
  startTime,
  type Settings,
  type Appointment,
  type BookingInput,
} from "../worker/src/domain";
const money = (n: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    maximumFractionDigits: 0,
  }).format(n);
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00-06:00`).toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Guatemala",
  });
const labels = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  completed: "Finalizada",
  cancelled: "Cancelada",
};
function NailArt({ variant = 0 }: { variant?: number }) {
  const colors = ["#c8818d", "#e9c9b4", "#784358"];
  return (
    <svg
      viewBox="0 0 360 440"
      role="img"
      aria-label={
        [
          "Ilustración de uñas en rosa con detalles florales",
          "Ilustración de manicura francesa en tonos nude",
          "Ilustración de uñas color vino",
        ][variant]
      }
    >
      <defs>
        <linearGradient id={`bg${variant}`} x2="1" y2="1">
          <stop stopColor={["#efd9d8", "#f0e5d8", "#dfc5cd"][variant]} />
          <stop
            offset="1"
            stopColor={["#d8b6b5", "#dac6af", "#b68b9a"][variant]}
          />
        </linearGradient>
      </defs>
      <rect width="360" height="440" fill={`url(#bg${variant})`} />
      <circle cx="285" cy="85" r="120" fill="#fff" opacity=".15" />
      <path
        d="M-20 390C100 320 200 470 390 300"
        fill="none"
        stroke="#fff"
        strokeWidth="60"
        opacity=".12"
      />
      {[0, 1, 2, 3].map((n) => (
        <g
          key={n}
          transform={`translate(${45 + n * 70} ${90 + Math.abs(1.5 - n) * 30}) rotate(${(n - 1.5) * 8} 28 140)`}
        >
          <rect
            x="0"
            y="0"
            width="57"
            height="260"
            rx="29"
            fill="#bd8873"
            opacity=".35"
            transform="translate(5 8)"
          />
          <rect
            width="57"
            height="260"
            rx="29"
            fill={["#edbfaa", "#e4b397", "#edc3ab"][variant]}
          />
          <rect
            x="5"
            y="8"
            width="47"
            height="95"
            rx="22"
            fill={colors[variant]}
          />
          {variant === 1 && (
            <path
              d="M5 36V29a23.5 23.5 0 0 1 47 0v7q-24-15-47 0"
              fill="#fff9f2"
            />
          )}
          {variant === 0 && n % 2 === 0 && (
            <g fill="#fff5eb">
              <ellipse cx="29" cy="49" rx="5" ry="12" />
              <ellipse
                cx="29"
                cy="49"
                rx="5"
                ry="12"
                transform="rotate(60 29 49)"
              />
              <ellipse
                cx="29"
                cy="49"
                rx="5"
                ry="12"
                transform="rotate(120 29 49)"
              />
              <circle cx="29" cy="49" r="4" fill="#b89053" />
            </g>
          )}
          <path
            d="M15 29v34"
            stroke="#fff"
            opacity=".32"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {variant === 2 && (
            <path d="M5 75q23-30 47 0" fill="none" stroke="#d7b681" />
          )}
        </g>
      ))}
    </svg>
  );
}
export default function App() {
  const [settings, setSettings] = useState<Settings>(initialSettings),
    [user, setUser] = useState<api.Me | null>(null);
  const [view, setView] = useState<"home" | "appointments" | "admin">("home"),
    [booking, setBooking] = useState<string | null>(null),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => api.watchSession(setUser, setError), []);
  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const signIn = async (staff = false) => {
    try {
      setError("");
      await api.login(staff);
    } catch {
      setError(
        "No pudimos iniciar sesión. Verificá que Google esté habilitado en Firebase e intentá de nuevo.",
      );
    }
  };
  const choose = (id: string) => {
    setBooking(id);
    setMenu(false);
  };
  return (
    <>
      {api.demo && (
        <div className="demo-banner">
          Demostración · Servicios, precios y horarios de ejemplo. No se envían
          reservas reales.{" "}
          <button onClick={() => signIn(!user?.staff)}>
            {user?.staff ? "Probar como clienta" : "Probar panel del personal"}
          </button>
        </div>
      )}
      <header className="header">
        <a href="#" className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">
            {settings.logoUrl ? (
              <img className="brand-logo" src={settings.logoUrl} alt="" />
            ) : (
              <>
                r<Flower2 size={15} />
              </>
            )}
          </span>
          <span>
            {settings.brand}
            <small>UN DETALLE PARA VOS</small>
          </span>
        </a>
        <button
          className="menu-toggle icon-button"
          aria-label="Abrir menú"
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>
        <nav className={menu ? "open" : ""}>
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => {
              setView("home");
              setMenu(false);
            }}
          >
            Inicio
          </button>
          <a
            href="#servicios"
            onClick={() => {
              setView("home");
              setMenu(false);
            }}
          >
            Servicios
          </a>
          <button
            onClick={() => {
              setView("appointments");
              setMenu(false);
            }}
          >
            Mis citas
          </button>
          {user?.staff && (
            <button
              onClick={() => {
                setView("admin");
                setMenu(false);
              }}
            >
              Panel de Rosita
            </button>
          )}
          {user ? (
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              onClick={() => api.logout()}
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button onClick={() => signIn()}>Ingresar</button>
          )}
          <button className="button small" onClick={() => choose("")}>
            Reservar una cita <ArrowRight size={15} />
          </button>
        </nav>
      </header>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            aria-label="Cerrar aviso"
            className="icon-button"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {view === "home" ? (
        <main>
          <section className="hero wrap">
            <div className="hero-copy">
              <span className="eyebrow">
                <span /> TU MOMENTO, TU ESTILO
              </span>
              <h1>
                Hay detalles
                <br />
                que te hacen
                <br />
                <em>sentir vos.</em>
                <Flower2 className="hero-flower" strokeWidth={0.8} />
              </h1>
              <p>{settings.tagline}</p>
              <p className="hero-description">
                Manos bonitas, una pausa para vos y mucho amor en cada detalle.
                Tu próxima cita empieza aquí.
              </p>
              <div className="hero-actions">
                <button className="button" onClick={() => choose("")}>
                  Reservá tu momento <ArrowRight size={18} />
                </button>
                <a className="text-link" href="#servicios">
                  Explorá los servicios
                </a>
              </div>
              <div className="hero-note">
                <ShieldCheck size={19} />
                <span>
                  Reservá con tranquilidad.
                  <br />
                  <strong>Rosita confirma tu cita personalmente.</strong>
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-label">HECHO CON AMOR, PARA VOS</div>
              <div className="art-frame">
                <NailArt />
              </div>
              <div className="art-sticker">
                <Sparkles size={22} />
                <span>
                  Un poquito de color.
                  <br />
                  <em>Mucho de vos.</em>
                </span>
              </div>
              <span className="art-caption">Ilustración de inspiración</span>
            </div>
          </section>
          <div className="ribbon">
            <span>
              <Flower2 />
              Detalles que enamoran
            </span>
            <span>
              <Heart />
              Un espacio para consentirte
            </span>
            <span>
              <Sparkles />
              Diseños con personalidad
            </span>
          </div>
          <section id="servicios" className="section wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ELEGÍ CÓMO CONSENTIRTE</span>
                <h2>
                  Tu estilo, hasta
                  <br />
                  <em>la punta de los dedos.</em>
                </h2>
              </div>
              <p>
                Un acabado delicado o un diseño que se roba las miradas.
                Encontrá tu próximo favorito.
              </p>
            </div>
            {loading ? (
              <p>Cargando servicios…</p>
            ) : settings.services.filter((x) => x.active).length === 0 ? (
              <div className="empty">
                <Flower2 />
                <h3>Estamos preparando algo lindo.</h3>
                <p>
                  Pronto vas a encontrar aquí nuestros servicios y horarios.
                </p>
              </div>
            ) : (
              <div className="services">
                {settings.services
                  .filter((x) => x.active)
                  .map((service, i) => (
                    <article className="service-card" key={service.id}>
                      <div className="service-image">
                        {service.imageUrl ? (
                          <img src={service.imageUrl} alt={service.name} />
                        ) : (
                          <>
                            <NailArt variant={i % 3} />
                            <span>Inspiración ilustrada</span>
                          </>
                        )}
                      </div>
                      <div className="service-info">
                        <span className="service-number">0{i + 1}</span>
                        <h3>{service.name}</h3>
                        <p>{service.description}</p>
                        <div className="service-bottom">
                          <span>
                            {money(service.price)}
                            <small>
                              <Clock3 size={12} />
                              {service.duration} min
                            </small>
                          </span>
                          <button
                            aria-label={`Reservar ${service.name}`}
                            className="round-button"
                            onClick={() => choose(service.id)}
                          >
                            <ArrowRight size={19} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
          <section className="how section wrap">
            <div>
              <span className="eyebrow">FÁCIL, COMO DEBERÍA SER</span>
              <h2>
                Nos vemos
                <br />
                <em>en tu próxima cita.</em>
              </h2>
              <p>
                Cuatro espacios al día para darte el tiempo
                <br />y la atención que merecés.
              </p>
            </div>
            <div className="steps">
              {[
                [
                  "01",
                  "Elegí tu favorito",
                  "Encontrá el servicio que va con vos.",
                ],
                [
                  "02",
                  "Buscá tu momento",
                  "Elegí un día y un horario disponible.",
                ],
                [
                  "03",
                  "Esperá tu confirmación",
                  "Rosita revisa y confirma tu solicitud.",
                ],
              ].map(([n, title, text]) => (
                <div className="how-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="contact-section">
            <Flower2 size={40} strokeWidth={1} />
            <h2>¿Tenés un diseño en mente?</h2>
            <p>
              Nos encanta conocer tus ideas. Hablemos de tu próxima manicura.
            </p>
            {settings.whatsapp ? (
              <a
                className="button light"
                href={`https://wa.me/${settings.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} />
                Escribinos por WhatsApp
              </a>
            ) : (
              <p className="muted">Pronto compartiremos nuestro contacto.</p>
            )}
            {settings.address && <p>{settings.address}</p>}
          </section>
        </main>
      ) : view === "appointments" ? (
        <Appointments settings={settings} user={user} login={() => signIn()} />
      ) : user?.staff ? (
        <Admin settings={settings} onSettings={setSettings} />
      ) : (
        <div className="empty wrap">
          <ShieldCheck />
          <h2>Panel del personal</h2>
          <p>Ingresá con una cuenta autorizada para administrar las citas.</p>
          <button className="button" onClick={() => signIn()}>
            Ingresar con Google
          </button>
        </div>
      )}
      <footer className="footer wrap">
        <a className="brand" href="#" onClick={() => setView("home")}>
          {settings.brand}
          <Flower2 size={17} />
        </a>
        <span>Hecho con amor, un detalle a la vez.</span>
        <button onClick={() => setView("admin")}>Acceso del personal</button>
      </footer>
      {booking !== null && (
        <Booking
          settings={settings}
          serviceId={booking}
          user={user}
          login={() => signIn()}
          close={() => setBooking(null)}
          onDone={() => {
            setBooking(null);
            setView("appointments");
          }}
        />
      )}
    </>
  );
}
function Booking({
  settings,
  serviceId,
  user,
  login,
  close,
  onDone,
  appointment,
}: {
  settings: Settings;
  serviceId: string;
  user: api.Me | null;
  login: () => void;
  close: () => void;
  onDone: () => void;
  appointment?: Appointment;
}) {
  const [form, setForm] = useState<BookingInput>({
    serviceId: serviceId || settings.services.find((x) => x.active)?.id || "",
    date: api.defaultDate(),
    slot: "",
    name: appointment?.name || "",
    phone: appointment?.phone || "",
    note: appointment?.note || "",
  });
  const [slots, setSlots] = useState<{ slot: string; available: boolean }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    setSlots([]);
    setForm((f) => ({ ...f, slot: "" }));
    api
      .availability(form.date, form.serviceId)
      .then((x) => {
        if (active) setSlots(x.slots);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.date, form.serviceId]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    document.addEventListener("keydown", listener);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = previous;
    };
  }, [close, busy]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (appointment) await api.move(appointment.id, form.date, form.slot);
      else await api.book(form);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-overlay">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
      >
        <button
          autoFocus
          aria-label="Cerrar"
          className="icon-button close"
          onClick={close}
          disabled={busy}
        >
          <X />
        </button>
        <span className="eyebrow">UN MOMENTO PARA VOS</span>
        <h2 id="booking-title">
          {appointment ? "Cambiá tu cita" : "Reservá tu próxima cita"}
        </h2>
        <p className="muted">
          Tu solicitud queda pendiente hasta que Rosita la confirme.
        </p>
        {!user ? (
          <div className="empty">
            <Heart />
            <p>Ingresá con Google para reservar y consultar tus citas.</p>
            <button className="button" onClick={login}>
              Continuar con Google <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>
              Servicio
              <select
                required
                disabled={!!appointment}
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
              >
                {settings.services
                  .filter((s) => s.active || s.id === appointment?.serviceId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {money(s.price)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              ¿Qué día te viene bien?
              <input
                required
                type="date"
                value={form.date}
                min={new Date().toLocaleDateString("en-CA", {
                  timeZone: "America/Guatemala",
                })}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <fieldset>
              <legend>Elegí tu horario</legend>
              <div className="slots">
                {slots.map((s) => (
                  <button
                    key={s.slot}
                    type="button"
                    disabled={!s.available || busy}
                    className={form.slot === s.slot ? "selected" : ""}
                    onClick={() => setForm({ ...form, slot: s.slot })}
                  >
                    {s.slot}
                  </button>
                ))}
              </div>
              {slotsLoading ? (
                <p className="hint">Consultando horarios…</p>
              ) : (
                !slots.some((x) => x.available) && (
                  <p className="hint">
                    No hay espacios disponibles. Probá con otra fecha.
                  </p>
                )
              )}
            </fieldset>
            {!appointment && (
              <>
                <div className="form-row">
                  <label>
                    Tu nombre
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      minLength={8}
                      maxLength={24}
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  ¿Algo que querés contarnos? <small>(opcional)</small>
                  <textarea
                    maxLength={500}
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </label>
              </>
            )}
            <div className="policy">
              <Clock3 size={16} />
              <span>
                Podés cambiar tu cita una sola vez, con al menos 24 horas de
                anticipación. El nuevo horario también debe estar a 24 horas o
                más.
              </span>
            </div>
            {error && (
              <p role="alert" className="error-inline">
                {error}
              </p>
            )}
            <button
              className="button full"
              disabled={busy || !form.slot || !settings.bookingEnabled}
            >
              {busy
                ? "Guardando…"
                : appointment
                  ? "Solicitar cambio"
                  : "Enviar solicitud"}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
function Appointments({
  settings,
  user,
  login,
  admin = false,
}: {
  settings: Settings;
  user: api.Me | null;
  login: () => void;
  admin?: boolean;
}) {
  const [items, setItems] = useState<Appointment[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [change, setChange] = useState<Appointment | null>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(""),
    [cursor, setCursor] = useState<string | null>(null);
  const refresh = (more = false) => {
    setLoading(true);
    return api
      .getAppointments(more ? (cursor ?? undefined) : undefined)
      .then((page) => {
        setItems((old) => (more ? [...old, ...page.items] : page.items));
        setCursor(page.nextCursor);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (user) void refresh();
  }, [user?.uid, user?.staff]);
  const status = async (a: Appointment, s: Appointment["status"]) => {
    setBusy(a.id);
    setError("");
    try {
      await api.setStatus(a.id, s);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const whatsapp = (a: Appointment) => {
    const text = settings.confirmationTemplate
      .replaceAll("{nombre}", a.name)
      .replaceAll("{fecha}", dateLabel(a.date))
      .replaceAll("{hora}", a.slot);
    return `https://wa.me/${a.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  };
  const visible = items.filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      `${a.name} ${a.phone} ${a.serviceName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className={admin ? "" : "section wrap"}>
      <span className="eyebrow">
        {admin ? "TU AGENDA, EN UN SOLO LUGAR" : "NOS VEMOS PRONTO"}
      </span>
      <h2>{admin ? "Agenda de Rosita" : "Mis citas"}</h2>
      {!user ? (
        <div className="empty">
          <CalendarDays />
          <h3>Tus próximos momentos de cuidado.</h3>
          <p>Ingresá para ver tus solicitudes y citas confirmadas.</p>
          <button className="button" onClick={login}>
            Ingresar con Google
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <select
              aria-label="Filtrar citas"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas las citas</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {admin && (
              <input
                aria-label="Buscar clienta"
                placeholder="Buscar por nombre o teléfono"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <button
              className="text-link"
              onClick={() => refresh()}
              disabled={loading}
            >
              Actualizar
            </button>
          </div>
          {error && (
            <p role="alert" className="error-inline">
              {error}
            </p>
          )}
          {loading ? (
            <p>Cargando citas…</p>
          ) : visible.length === 0 ? (
            <div className="empty">
              <CalendarDays />
              <h3>Todavía no hay citas aquí.</h3>
              <p>
                {admin
                  ? "Las nuevas solicitudes aparecerán en esta agenda."
                  : "Cuando reservés, vas a poder seguir tu solicitud desde aquí."}
              </p>
            </div>
          ) : (
            <div className="appointment-list">
              {visible
                .sort((a, b) =>
                  `${b.date}${b.slot}`.localeCompare(`${a.date}${a.slot}`),
                )
                .map((a) => (
                  <article className="appointment" key={a.id}>
                    <div className="appointment-top">
                      <span className={`badge ${a.status}`}>
                        {labels[a.status]}
                      </span>
                      <small>
                        {a.changes
                          ? "Cambio utilizado"
                          : "Un cambio disponible"}
                      </small>
                    </div>
                    <h3>{a.serviceName}</h3>
                    <div className="appointment-time">
                      <CalendarDays size={17} />
                      {dateLabel(a.date)}
                      <Clock3 size={17} />
                      {a.slot}
                    </div>
                    <p>
                      {a.name} · {money(a.price)}
                    </p>
                    {admin && (
                      <>
                        <p className="muted">
                          {a.phone} · {a.email}
                        </p>
                        {a.note && <blockquote>{a.note}</blockquote>}
                      </>
                    )}
                    <div className="appointment-actions">
                      {admin ? (
                        <>
                          {a.status === "pending" && (
                            <button
                              className="button small"
                              disabled={busy === a.id}
                              onClick={() => status(a, "confirmed")}
                            >
                              <Check size={15} />
                              Confirmar
                            </button>
                          )}
                          {a.status === "confirmed" && (
                            <button
                              className="button small"
                              disabled={busy === a.id}
                              onClick={() => status(a, "completed")}
                            >
                              Finalizar
                            </button>
                          )}
                          {["pending", "confirmed"].includes(a.status) && (
                            <button
                              className="text-link"
                              disabled={busy === a.id}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `¿Cancelar la cita de ${a.name}?`,
                                  )
                                )
                                  void status(a, "cancelled");
                              }}
                            >
                              Cancelar cita
                            </button>
                          )}
                          <a
                            className="text-link"
                            href={whatsapp(a)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle size={15} />
                            WhatsApp
                          </a>
                        </>
                      ) : (
                        ["pending", "confirmed"].includes(a.status) &&
                        a.changes === 0 &&
                        startTime(a.date, a.slot) - Date.now() >= 86400000 && (
                          <button
                            className="text-link"
                            onClick={() => setChange(a)}
                          >
                            Cambiar horario <ArrowRight size={15} />
                          </button>
                        )
                      )}
                    </div>
                    <Photos appointment={a} staff={admin} />
                  </article>
                ))}
            </div>
          )}
          {cursor && (
            <button
              className="button small"
              disabled={loading}
              onClick={() => refresh(true)}
            >
              Ver más citas
            </button>
          )}
        </>
      )}
      {change && (
        <Booking
          settings={settings}
          serviceId={change.serviceId}
          user={user}
          login={login}
          appointment={change}
          close={() => setChange(null)}
          onDone={() => {
            setChange(null);
            void refresh();
          }}
        />
      )}
    </section>
  );
}
function Photos({
  appointment,
  staff,
}: {
  appointment: Appointment;
  staff: boolean;
}) {
  const [open, setOpen] = useState(false),
    [photos, setPhotos] = useState<api.Photo[]>([]),
    [urls, setUrls] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const created: string[] = [];
    api
      .getPhotos(appointment.id)
      .then(async (rows) => {
        if (active) setPhotos(rows);
        for (const photo of rows) {
          try {
            const url = await api.photoUrl(photo.id);
            created.push(url);
            if (active) setUrls((u) => ({ ...u, [photo.id]: url }));
            else URL.revokeObjectURL(url);
          } catch {
            if (active) setError("No se pudieron cargar algunas fotos.");
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      created.forEach(URL.revokeObjectURL);
    };
  }, [open, appointment.id]);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadPhoto(
        appointment.id,
        file,
        staff ? "result" : "reference",
      );
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="photo-section">
      <button className="text-link" onClick={() => setOpen(!open)}>
        <ImagePlus size={16} />
        {open ? "Cerrar fotos" : "Referencias y fotos"}
      </button>
      {open && (
        <>
          <div className="photo-grid">
            {photos.map((p) => (
              <figure key={p.id}>
                {urls[p.id] ? (
                  <img
                    src={urls[p.id]}
                    alt={
                      p.kind === "result"
                        ? "Trabajo terminado"
                        : "Referencia de la clienta"
                    }
                  />
                ) : (
                  <span>Cargando foto…</span>
                )}
                <figcaption>
                  {p.kind === "result" ? "Resultado" : "Referencia"}
                </figcaption>
              </figure>
            ))}
          </div>
          {photos.length === 0 && (
            <p className="hint">Todavía no hay fotografías para esta cita.</p>
          )}
          {(staff || ["pending", "confirmed"].includes(appointment.status)) && (
            <label className="upload-label">
              {busy
                ? "Subiendo…"
                : staff
                  ? "Agregar foto del resultado"
                  : "Agregar mi referencia"}
              <input
                disabled={busy}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
          )}
          <p className="hint">Fotos privadas · JPG, PNG o WebP · Hasta 5 MB</p>
          {error && (
            <p role="alert" className="error-inline">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
function Admin({
  settings,
  onSettings,
}: {
  settings: Settings;
  onSettings: (s: Settings) => void;
}) {
  const [tab, setTab] = useState<"agenda" | "clients" | "settings">("agenda"),
    [clients, setClients] = useState<Appointment[]>([]),
    [error, setError] = useState(""),
    [clientCursor, setClientCursor] = useState<string | null>(null);
  useEffect(() => {
    if (tab === "clients")
      api
        .getAppointments()
        .then((page) => {
          setClients(page.items);
          setClientCursor(page.nextCursor);
        })
        .catch((e) => setError(e.message));
  }, [tab]);
  return (
    <main className="section wrap admin">
      <div className="tabs">
        <button
          className={tab === "agenda" ? "selected" : ""}
          onClick={() => setTab("agenda")}
        >
          <CalendarDays size={17} />
          Agenda
        </button>
        <button
          className={tab === "clients" ? "selected" : ""}
          onClick={() => setTab("clients")}
        >
          <Heart size={17} />
          Clientas
        </button>
        <button
          className={tab === "settings" ? "selected" : ""}
          onClick={() => setTab("settings")}
        >
          <Settings2 size={17} />
          Mi negocio
        </button>
      </div>
      {tab === "agenda" ? (
        <Appointments
          settings={settings}
          user={{ uid: "staff", email: "", staff: true }}
          login={() => undefined}
          admin
        />
      ) : tab === "settings" ? (
        <SettingsForm settings={settings} onSave={onSettings} />
      ) : (
        <>
          <span className="eyebrow">CADA CLIENTA, UNA HISTORIA</span>
          <h2>Historial de clientas</h2>
          {error && <p className="error-inline">{error}</p>}
          {clients.length === 0 ? (
            <div className="empty">
              El historial aparecerá cuando recibás tus primeras reservas.
            </div>
          ) : (
            Array.from(new Set(clients.map((a) => a.uid))).map((uid) => {
              const visits = clients.filter((a) => a.uid === uid);
              return (
                <details className="client" key={uid}>
                  <summary>
                    <strong>{visits[0].name}</strong>
                    <span>
                      {visits.length} citas · {visits[0].phone}
                    </span>
                  </summary>
                  {visits.map((a) => (
                    <div className="client-visit" key={a.id}>
                      <span>
                        {a.date} · {a.serviceName}
                      </span>
                      <span className={`badge ${a.status}`}>
                        {labels[a.status]}
                      </span>
                      <Photos appointment={a} staff />
                    </div>
                  ))}
                </details>
              );
            })
          )}
          {clientCursor && (
            <button
              className="button small"
              onClick={() =>
                api
                  .getAppointments(clientCursor)
                  .then((page) => {
                    setClients((old) => [...old, ...page.items]);
                    setClientCursor(page.nextCursor);
                  })
                  .catch((e) => setError(e.message))
              }
            >
              Ver más historial
            </button>
          )}
        </>
      )}
    </main>
  );
}
function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  const [form, setForm] = useState(settings),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const s = await api.updateSettings(form);
      onSave(s);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="settings-form" onSubmit={submit}>
      <span className="eyebrow">A TU MANERA</span>
      <h2>Mi negocio</h2>
      <p className="muted">
        Revisá servicios, precios y horarios antes de habilitar las reservas.
      </p>
      <ImageUpload
        label="Logo del negocio"
        url={form.logoUrl}
        onChange={(logoUrl) => setForm({ ...form, logoUrl })}
      />
      <div className="form-row">
        <label>
          Nombre del negocio
          <input
            required
            maxLength={60}
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
        </label>
        <label>
          WhatsApp con código de país
          <input
            pattern="[0-9]{8,15}"
            placeholder="502…"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </label>
      </div>
      <label>
        Frase de bienvenida
        <input
          maxLength={160}
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
      </label>
      <label>
        Dirección
        <input
          maxLength={240}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <h3>Los cuatro horarios del día</h3>
      <p className="hint">
        Hora de Guatemala. Las duraciones de los servicios también bloquean los
        cruces de horario.
      </p>
      <div className="slots">
        {form.slots.map((slot, i) => (
          <label key={i}>
            Horario {i + 1}
            <input
              required
              type="time"
              value={slot}
              onChange={(e) =>
                setForm({
                  ...form,
                  slots: form.slots.map((s, n) =>
                    n === i ? e.target.value : s,
                  ),
                })
              }
            />
          </label>
        ))}
      </div>
      <fieldset>
        <legend>Días de atención</legend>
        <div className="days">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={form.openDays.includes(i)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    openDays: e.target.checked
                      ? [...form.openDays, i]
                      : form.openDays.filter((d) => d !== i),
                  })
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Fechas sin atención <small>(una fecha por línea)</small>
        <textarea
          rows={3}
          placeholder="2026-12-25"
          value={form.closedDates.join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              closedDates: e.target.value.split("\n").filter(Boolean),
            })
          }
        />
      </label>
      <h3>Servicios y precios</h3>
      {form.services.map((s, i) => (
        <div className="service-editor" key={s.id}>
          <div className="form-row">
            <label>
              Nombre
              <input
                required
                value={s.name}
                maxLength={80}
                onChange={(e) =>
                  setForm({
                    ...form,
                    services: form.services.map((v, n) =>
                      n === i ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            <label>
              Precio en quetzales
              <input
                required
                type="number"
                min={0}
                max={100000}
                value={s.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    services: form.services.map((v, n) =>
                      n === i ? { ...v, price: Number(e.target.value) } : v,
                    ),
                  })
                }
              />
            </label>
            <label>
              Duración en minutos
              <input
                required
                type="number"
                min={15}
                max={300}
                value={s.duration}
                onChange={(e) =>
                  setForm({
                    ...form,
                    services: form.services.map((v, n) =>
                      n === i ? { ...v, duration: Number(e.target.value) } : v,
                    ),
                  })
                }
              />
            </label>
          </div>
          <label>
            Descripción
            <input
              value={s.description}
              maxLength={200}
              onChange={(e) =>
                setForm({
                  ...form,
                  services: form.services.map((v, n) =>
                    n === i ? { ...v, description: e.target.value } : v,
                  ),
                })
              }
            />
          </label>
          <ImageUpload
            label="Foto pública del servicio"
            url={s.imageUrl}
            onChange={(imageUrl) =>
              setForm({
                ...form,
                services: form.services.map((v, n) =>
                  n === i ? { ...v, imageUrl } : v,
                ),
              })
            }
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={s.active}
              onChange={(e) =>
                setForm({
                  ...form,
                  services: form.services.map((v, n) =>
                    n === i ? { ...v, active: e.target.checked } : v,
                  ),
                })
              }
            />
            Mostrar en el catálogo
          </label>
        </div>
      ))}
      <button
        type="button"
        className="text-link"
        disabled={form.services.length >= 30}
        onClick={() =>
          setForm({
            ...form,
            services: [
              ...form.services,
              {
                id: crypto.randomUUID(),
                name: "",
                description: "",
                price: 0,
                duration: 90,
                active: true,
              },
            ],
          })
        }
      >
        + Agregar servicio
      </button>
      <label>
        Mensaje de confirmación para WhatsApp
        <textarea
          rows={3}
          maxLength={1000}
          value={form.confirmationTemplate}
          onChange={(e) =>
            setForm({ ...form, confirmationTemplate: e.target.value })
          }
        />
        <small>
          Podés usar {"{nombre}"}, {"{fecha}"} y {"{hora}"}.
        </small>
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.bookingEnabled}
          onChange={(e) =>
            setForm({ ...form, bookingEnabled: e.target.checked })
          }
        />
        Habilitar solicitudes de reserva
      </label>
      {error && (
        <p role="alert" className="error-inline">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="success">
          Los cambios ya están guardados.
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Guardando…" : "Guardar cambios"}
        <Check size={17} />
      </button>
    </form>
  );
}

function ImageUpload({
  label,
  url,
  onChange,
}: {
  label: string;
  url?: string;
  onChange: (url: string) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await api.uploadPublic(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="branding-upload">
      {url && <img src={url} alt={label} />}
      <label>
        {label}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <small>
          {busy
            ? "Subiendo…"
            : "Imagen pública del negocio. Hasta 5 MB. Guardá los cambios después de subirla."}
        </small>
      </label>
      {url && (
        <button
          className="text-link"
          type="button"
          onClick={() => onChange("")}
        >
          Quitar imagen
        </button>
      )}
      {error && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
