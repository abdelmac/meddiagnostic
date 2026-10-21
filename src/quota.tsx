import { useEffect, useState } from "react";
import { useAuth } from "./auth";
import type { Allowance } from "./domain/quotas";
import { getAllowance, onQuotaChanged } from "./services/quotas";
export function useQuota() {
  const { user } = useAuth();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setAllowance(null);
    const load = () => getAllowance(user?.id ?? null).then((next) => { if (alive) { setAllowance(next); setError(""); } }).catch(() => { if (alive) setError("Impossible de vérifier votre quota. Réessayez."); });
    void load();
    const unsubscribe = onQuotaChanged(() => void load());
    const timer = setInterval(() => void load(), 60_000);
    return () => { alive = false; clearInterval(timer); unsubscribe(); };
  }, [user?.id]);
  return { allowance, error };
}
