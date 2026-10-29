import { describe, it, expect } from "vitest";
import {
  assertBookable,
  assertCanMove,
  occupy,
  release,
  settingsSchema,
  initialSettings,
  startTime,
  type Appointment,
} from "../worker/src/domain";
const config = {
  ...initialSettings,
  bookingEnabled: true,
  openDays: [0, 1, 2, 3, 4, 5, 6],
};
const appointment: Appointment = {
  id: "a",
  uid: "owner",
  email: "client@example.invalid",
  date: "2026-11-03",
  slot: "09:00",
  serviceId: "gel",
  serviceName: "Gel",
  price: 100,
  duration: 90,
  name: "Demo",
  phone: "55555555",
  note: "",
  status: "confirmed",
  changes: 0,
  createdAt: "",
  updatedAt: "",
};
describe("appointment business rules", () => {
  it("allows exactly 24 hours before the original appointment", () =>
    expect(() =>
      assertCanMove(
        appointment,
        "owner",
        startTime(appointment.date, appointment.slot) - 86400000,
      ),
    ).not.toThrow());
  it("rejects one millisecond inside the deadline", () =>
    expect(() =>
      assertCanMove(
        appointment,
        "owner",
        startTime(appointment.date, appointment.slot) - 86400000 + 1,
      ),
    ).toThrow("24 horas"));
  it("rejects another client", () =>
    expect(() => assertCanMove(appointment, "other", 0)).toThrow("acceso"));
  it("rejects a second change", () =>
    expect(() =>
      assertCanMove({ ...appointment, changes: 1 }, "owner", 0),
    ).toThrow("único cambio"));
  it.each(["cancelled", "completed"] as const)(
    "does not move a %s appointment",
    (status) =>
      expect(() =>
        assertCanMove({ ...appointment, status }, "owner", 0),
      ).toThrow("no admite cambios"),
  );
  it("does not accept an unconfigured slot", () =>
    expect(() =>
      assertBookable(
        config,
        { date: "2026-11-03", slot: "10:00" },
        Date.parse("2026-11-01"),
      ),
    ).toThrow("Horario"));
  it("blocks past dates", () =>
    expect(() =>
      assertBookable(config, appointment, Date.parse("2026-12-01")),
    ).toThrow("fecha futura"));
  it("blocks closed dates", () =>
    expect(() =>
      assertBookable(
        { ...config, closedDates: ["2026-11-03"] },
        appointment,
        Date.parse("2026-11-01"),
      ),
    ).toThrow("no hay atención"));
  it("blocks closed weekdays", () =>
    expect(() =>
      assertBookable(
        { ...config, openDays: [] },
        appointment,
        Date.parse("2026-11-01"),
      ),
    ).toThrow("no hay atención"));
  it("fails closed until bookings are enabled", () =>
    expect(() =>
      assertBookable(initialSettings, appointment, Date.parse("2026-11-01")),
    ).toThrow("no están habilitadas"));
  it("rejects impossible calendar dates", () =>
    expect(() => startTime("2026-02-30", "09:00")).toThrow("no es válida"));
  it("allows future bookable slots", () =>
    expect(() =>
      assertBookable(config, appointment, Date.parse("2026-11-01")),
    ).not.toThrow());
});
describe("daily occupancy", () => {
  it("prevents duplicate bookings in a slot", () =>
    expect(() =>
      occupy(
        { appointments: { "09:00": { id: "taken", duration: 90 } } },
        "09:00",
        "new",
        90,
      ),
    ).toThrow("ocupado"));
  it("prevents an overlapping duration despite different start times", () =>
    expect(() =>
      occupy(
        { appointments: { "09:00": { id: "taken", duration: 180 } } },
        "11:00",
        "new",
        90,
      ),
    ).toThrow("ocupado"));
  it("allows back to back appointments", () =>
    expect(
      occupy(
        { appointments: { "09:00": { id: "taken", duration: 120 } } },
        "11:00",
        "new",
        90,
      ).appointments["11:00"].id,
    ).toBe("new"));
  it("enforces four appointments even if starts do not overlap", () =>
    expect(() =>
      occupy(
        {
          appointments: {
            "08:00": { id: "a", duration: 30 },
            "09:00": { id: "b", duration: 30 },
            "10:00": { id: "c", duration: 30 },
            "11:00": { id: "d", duration: 30 },
          },
        },
        "12:00",
        "e",
        30,
      ),
    ).toThrow("ocupado"));
  it("releases only the intended booking", () =>
    expect(
      release(
        {
          appointments: {
            "09:00": { id: "a", duration: 90 },
            "11:00": { id: "b", duration: 90 },
          },
        },
        "a",
      ),
    ).toEqual({ appointments: { "11:00": { id: "b", duration: 90 } } }));
});
describe("configuration validation", () => {
  it("rejects repeated slots", () =>
    expect(
      settingsSchema.safeParse({
        ...config,
        slots: ["09:00", "09:00", "14:00", "16:00"],
      }).success,
    ).toBe(false));
  it("rejects duplicate service identifiers", () => {
    const s = {
      id: "gel",
      name: "Gel",
      description: "",
      duration: 90,
      price: 100,
      active: true,
    };
    expect(
      settingsSchema.safeParse({ ...config, services: [s, s] }).success,
    ).toBe(false);
  });
});
