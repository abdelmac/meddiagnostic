import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let instance: SupabaseClient | null = null;
export function getSupabase() {
  if (Platform.OS === "web" && typeof window === "undefined") return null;
  if (!url || !key) return null;
  if (!instance)
    instance = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web",
        flowType: "pkce",
      },
    });
  return instance;
}
