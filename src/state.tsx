import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { initialState } from "./domain/engine";
import type { LocalState } from "./domain/types";

const KEY = "medquiz.local.v1";
type Store = {
  state: LocalState;
  update: (fn: (s: LocalState) => LocalState) => void;
  ready: boolean;
  error: string;
  clearError: () => void;
};
const Context = createContext<Store>(null!);
function isState(value: unknown): value is LocalState {
  if (!value || typeof value !== "object") return false;
  const s = value as LocalState;
  return (
    s.schema === 1 &&
    Array.isArray(s.attempts) &&
    Array.isArray(s.sessions) &&
    Array.isArray(s.favorites) &&
    Array.isArray(s.marked) &&
    Array.isArray(s.reports) &&
    !!s.preferences &&
    Array.isArray(s.preferences.specialties) &&
    !!s.reviews &&
    (s.active === null || (!!s.active?.questionIds && !!s.active.answers))
  );
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (!isState(parsed)) throw Error("Format incompatible");
          setState(parsed);
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Vos données locales ne peuvent pas être chargées. Elles ne seront pas écrasées. Exportez-les avant de réinitialiser le stockage du navigateur.",
          );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  const update: Store["update"] = (fn) => {
    if (!ready || error.startsWith("Vos données")) return;
    setState((current) => fn(current));
  };
  const first = useRef(true);
  useEffect(() => {
    if (!ready || error.startsWith("Vos données")) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const raw = JSON.stringify(state);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, raw))
      .catch(() =>
        setError(
          "La sauvegarde locale a échoué. Libérez de l’espace avant de quitter cette page.",
        ),
      );
  }, [state, ready]);
  return (
    <Context.Provider
      value={{ state, update, ready, error, clearError: () => setError("") }}
    >
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
