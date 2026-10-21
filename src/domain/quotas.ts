export type Allowance = {
  premium: boolean;
  used: number;
  remaining: number | null;
  maxQuestions: number | null;
  day: string;
  resetsAt: string;
};
export type Reservation = { id: string; day: string; count: number };
export function parisDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function guestAllowance(reservations: Reservation[], now = new Date()): Allowance {
  const day = parisDay(now);
  const used = reservations.filter((r) => r.day === day).length;
  let low = now.getTime(), high = low + 26 * 3600_000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (parisDay(new Date(middle)) === day) low = middle;
    else high = middle;
  }
  return { premium: false, used, remaining: Math.max(0, 3 - used), maxQuestions: 10, day, resetsAt: new Date(high).toISOString() };
}
export function reservationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  // An idempotency identifier, never an authentication credential.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 3) | 8).toString(16);
  });
}
