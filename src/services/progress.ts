import { getSupabase } from "./supabase";
import {
  canonical,
  captureChanges,
  mergeProgress,
  prepareSnapshot,
} from "../domain/sync";
import type { LocalState } from "../domain/types";
import { isLocalState } from "../state-validation";
export async function synchronize(
  userId: string,
  local: LocalState,
): Promise<LocalState> {
  const client = getSupabase();
  if (!client) throw Error("Comptes indisponibles pour le moment.");
  let merged = captureChanges(local, local);
  for (let i = 0; i < 4; i++) {
    const { data, error } = await client
      .from("progress_snapshots")
      .select("version,payload")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      if (!isLocalState(data.payload))
        throw Error("Format de synchronisation incompatible.");
      merged = mergeProgress(merged, data.payload);
    }
    const payload = prepareSnapshot(merged);
    // Actor identity is device-local, so compare content rather than that identity.
    if (
      data &&
      canonical({
        ...payload,
        syncMeta: { ...payload.syncMeta, actor: "" },
      }) ===
        canonical({
          ...data.payload,
          syncMeta: { ...data.payload.syncMeta, actor: "" },
        })
    )
      return merged;
    const result = await client.rpc("save_progress", {
      expected_version: data?.version ?? 0,
      snapshot: payload,
    });
    if (result.error) throw result.error;
    if (result.data !== null) return merged;
  }
  throw Error("Synchronisation occupée. Réessayez dans un instant.");
}
