import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabase } from "./supabase";
import { guestAllowance, parisDay, type Allowance, type Reservation } from "../domain/quotas";
const KEY = "medquiz.guest-quota.v1";
const listeners = new Set<() => void>();
let queue: Promise<unknown> = Promise.resolve();
export const quotaChanged = () => listeners.forEach((listener) => listener());
export function onQuotaChanged(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
async function guestReservations(): Promise<Reservation[]> {
  const value: unknown = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  if (!Array.isArray(value) || value.some((r) => typeof r?.id !== "string" || typeof r?.day !== "string" || !Number.isInteger(r?.count)))
    throw Error("Impossible de vérifier votre quota. Réessayez.");
  return value;
}
export async function getAllowance(userId: string | null): Promise<Allowance> {
  if (!userId) return guestAllowance(await guestReservations());
  const client = getSupabase();
  if (!client) throw Error("Impossible de vérifier votre quota. Réessayez.");
  const { data, error } = await client.rpc("get_quiz_allowance");
  if (error || !data) throw Error("Impossible de vérifier votre quota. Réessayez.");
  return data;
}
export async function reserveSession(userId: string | null, id: string, count: number): Promise<Allowance> {
  if (userId) {
    const client = getSupabase();
    if (!client) throw Error("Impossible de vérifier votre quota. Réessayez.");
    const { data, error } = await client.rpc("reserve_quiz_session", { request_id: id, requested_count: count });
    if (error || !data) throw Error("Impossible de vérifier votre quota. Réessayez.");
    if (!data.allowed) throw Error(data.error === "question_limit" ? "Le mode gratuit permet dix questions maximum par session." : "Vos trois sessions gratuites du jour sont utilisées. Revenez demain ou passez à Premium.");
    quotaChanged();
    return data;
  }
  const execute = async () => {
    const rows = await guestReservations();
    const allowance = guestAllowance(rows);
    if (rows.some((r) => r.id === id && r.count === count)) return allowance;
    if (count < 1 || count > 10) throw Error("Le mode gratuit permet dix questions maximum par session.");
    if (allowance.remaining === 0) throw Error("Vos trois sessions gratuites du jour sont utilisées. Revenez demain ou passez à Premium.");
    const next = [...rows.filter((r) => r.day === parisDay()), { id, day: allowance.day, count }];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    quotaChanged();
    return guestAllowance(next);
  };
  const task = queue.then(() => typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request(KEY, execute) : execute());
  queue = task.catch(() => {});
  return task;
}
