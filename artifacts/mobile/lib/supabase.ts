import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// ── DB row types (matching our migrations) ──────────────────────────────────

export interface DbDriver {
  id: number;
  name: string;
  phone: string;
  avatar_letter: string;
  rank: "bronze" | "silver" | "gold" | "platinum";
  status: "active" | "suspended" | "inactive";
  balance: number;
  credit_limit: number;
  total_trips: number;
  rating: number;
  is_online: boolean;
  last_seen_at: string | null;
  auth_id: string | null;
}

export interface DbOrder {
  id: number;
  external_id: string | null;
  driver_id: number | null;
  restaurant_id: number | null;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude: number | null;
  customer_longitude: number | null;
  fare: number;
  cash_to_collect: number;
  commission: number;
  distance_km: number | null;
  assigned_at: string | null;
  created_at: string;
}

export interface DbRestaurant {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DbDailyEarning {
  driver_id: number;
  day: string;
  trips: number;
  earnings: number;
  cash_collected: number;
  commission: number;
}
