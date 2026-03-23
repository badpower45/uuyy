/* ─────────────────────────────────────────
  Swift Logistics — Shared DB Store (Supabase)
  الطيارين والمطاعم + تتبع الموقع
───────────────────────────────────────── */

import { supabase } from "./supabase";

export type DriverRank       = 'gold' | 'silver' | 'bronze';
export type DriverStatus     = 'available' | 'busy' | 'offline';
export type RestaurantStatus = 'active' | 'inactive' | 'suspended';
export type SubscriptionType = 'basic' | 'pro' | 'enterprise';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  pin: string;
  rank: DriverRank;
  vehicleType: 'motorcycle' | 'car';
  status: DriverStatus;
  wallet: number;
  orders: number;
  rating: number;
  warning: boolean;
  lat: number;
  lng: number;
  lastSeen: number;   // timestamp ms
  isTracking: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  subscription: SubscriptionType;
  status: RestaurantStatus;
  lat: number;
  lng: number;
  wallet: number;
  orders: number;
  pin: string;
}

let driversCache: Driver[] = [];
let restaurantsCache: Restaurant[] = [];
let lastSyncAt = 0;

function isSchemaCacheColumnError(err: any): boolean {
  const message = String(err?.message ?? "").toLowerCase();
  const code = String(err?.code ?? "").toUpperCase();
  return code === "PGRST204" || (message.includes("schema cache") && message.includes("column"));
}

function normalizeDriverStatus(value: any): DriverStatus {
  if (value === "available" || value === "busy" || value === "offline") return value;
  if (value === "active") return "available";
  if (value === "inactive" || value === "suspended") return "offline";
  return "offline";
}

function normalizeRestaurantStatus(value: any): RestaurantStatus {
  if (value === "active" || value === "inactive" || value === "suspended") return value;
  return "active";
}

function normalizeSubscription(value: any): SubscriptionType {
  if (value === "basic" || value === "pro" || value === "enterprise") return value;
  return "basic";
}

function mapDbDriver(row: any): Driver {
  const status = normalizeDriverStatus(row.status);
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    pin: "",
    rank: (row.rank ?? "bronze") as DriverRank,
    vehicleType: "motorcycle",
    status,
    wallet: Number(row.wallet_balance ?? row.balance ?? 0),
    orders: Number(row.orders_count ?? row.total_trips ?? 0),
    rating: Number(row.rating ?? 5),
    warning: Boolean(row.has_warning),
    lat: Number(row.lat ?? row.latitude ?? 30.0444),
    lng: Number(row.lng ?? row.longitude ?? 31.2357),
    lastSeen: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    isTracking: status !== "offline" || Boolean(row.is_online),
  };
}

function mapDbRestaurant(row: any): Restaurant {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone ?? "",
    address: row.address ?? "",
    city: row.city ?? "القاهرة",
    subscription: normalizeSubscription(row.subscription_type),
    status: normalizeRestaurantStatus(row.status),
    lat: Number(row.lat ?? row.latitude ?? 30.0444),
    lng: Number(row.lng ?? row.longitude ?? 31.2357),
    wallet: Number(row.wallet_balance ?? 0),
    orders: Number(row.total_orders ?? 0),
    pin: "",
  };
}

async function syncFromDb() {
  if (!supabase) return;
  const [driversRes, restaurantsRes] = await Promise.all([
    supabase.from("drivers").select("*").order("created_at", { ascending: true }),
    supabase.from("restaurants").select("*").order("created_at", { ascending: true }),
  ]);

  if (!driversRes.error && driversRes.data) {
    driversCache = driversRes.data.map(mapDbDriver);
  }
  if (!restaurantsRes.error && restaurantsRes.data) {
    restaurantsCache = restaurantsRes.data.map(mapDbRestaurant);
  }
  lastSyncAt = Date.now();
}

function ensureFreshCache() {
  if (!supabase) return;
  if (Date.now() - lastSyncAt > 7000) {
    void syncFromDb();
  }
}

void syncFromDb();

/* ─── Drivers API ─── */
export const getDrivers = () => {
  ensureFreshCache();
  return [...driversCache];
};

export const saveDrivers = (d: Driver[]) => {
  driversCache = [...d];
  if (!supabase) return;

  void Promise.all(
    d.map(async (x) => {
      const id = Number(x.id);
      if (!Number.isFinite(id)) return;

      const { error } = await supabase
        .from("drivers")
        .update({
          name: x.name,
          phone: x.phone,
          rank: x.rank,
          status: x.status === "offline" ? "inactive" : "active",
          balance: x.wallet,
          total_trips: x.orders,
          rating: x.rating,
          is_online: x.status !== "offline",
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("saveDrivers update failed", error.message);
      }
    }),
  );
};

export async function addDriver(data: Pick<Driver,'name'|'phone'|'pin'|'rank'|'vehicleType'>): Promise<Driver> {
  const drivers = [...driversCache];
  const d: Driver = {
    ...data,
    id: `tmp-${crypto.randomUUID()}`,
    status: 'offline',
    wallet: 0, orders: 0, rating: 5.0, warning: false,
    lat: 30.0444 + (Math.random() - 0.5) * 0.05,
    lng: 31.2357 + (Math.random() - 0.5) * 0.05,
    lastSeen: 0, isTracking: false,
  };

  if (!supabase) {
    driversCache = [...drivers, d];
    return d;
  }

  const { data: inserted, error } = await supabase
    .from("drivers")
    .insert({
      name: d.name,
      phone: d.phone,
      password_hash: `pin_${d.pin || "1234"}`,
      avatar_letter: d.name.trim().charAt(0) || "م",
      rank: d.rank,
      status: d.status === "offline" ? "inactive" : "active",
      balance: d.wallet,
      credit_limit: 500,
      total_trips: d.orders,
      rating: d.rating,
      is_online: d.status !== "offline",
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error && isSchemaCacheColumnError(error)) {
    const { data: legacyInserted, error: legacyError } = await supabase
      .from("drivers")
      .insert({
        name: d.name,
        phone: d.phone,
        password_hash: `pin_${d.pin || "1234"}`,
        avatar_letter: d.name.trim().charAt(0) || "م",
        rank: d.rank,
        status: "active",
      })
      .select("*")
      .single();

    if (legacyError) {
      throw new Error(legacyError.message || "تعذر حفظ بيانات الطيار في قاعدة البيانات");
    }

    const persistedLegacy = mapDbDriver(legacyInserted);
    persistedLegacy.pin = d.pin;
    persistedLegacy.vehicleType = d.vehicleType;
    driversCache = [...drivers, persistedLegacy];
    return persistedLegacy;
  }

  if (error) {
    throw new Error(error.message || "تعذر حفظ بيانات الطيار في قاعدة البيانات");
  }

  const persisted = mapDbDriver(inserted);
  persisted.pin = d.pin;
  persisted.vehicleType = d.vehicleType;
  driversCache = [...drivers, persisted];
  return persisted;
}

export function updateDriverLocation(id: string, lat: number, lng: number): void {
  driversCache = driversCache.map(d =>
    d.id === id ? { ...d, lat, lng, isTracking: true, lastSeen: Date.now() } : d
  );

  if (supabase) {
    void supabase
      .from("driver_locations")
      .insert({
        driver_id: Number(id),
        latitude: lat,
        longitude: lng,
      });

    void supabase
      .from("drivers")
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq("id", Number(id));
  }
}

export function updateDriverStatus(id: string, status: DriverStatus): void {
  driversCache = driversCache.map(d =>
    d.id === id ? { ...d, status, isTracking: status !== 'offline', lastSeen: Date.now() } : d
  );

  if (supabase) {
    void supabase
      .from("drivers")
      .update({
        status: status === "offline" ? "inactive" : "active",
        is_online: status !== "offline",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", Number(id));
  }
}

export function loginDriver(phone: string, pin: string): Driver | null {
  ensureFreshCache();
  const normalizedPhone = phone.trim();
  const normalizedPin = pin.trim();
  if (!normalizedPhone || !normalizedPin) return null;

  return (
    driversCache.find(
      (d) =>
        d.phone === normalizedPhone &&
        // Seeded/legacy records use default PIN until auth module is completed.
        (d.pin ? d.pin === normalizedPin : normalizedPin === "1234"),
    ) ?? null
  );
}

/* ─── Restaurants API ─── */
export const getRestaurants = () => {
  ensureFreshCache();
  return [...restaurantsCache];
};

export const saveRestaurants = (r: Restaurant[]) => {
  restaurantsCache = [...r];
  if (!supabase) return;

  const payload = r.map((x) => ({
    id: x.id,
    name: x.name,
    phone: x.phone,
    address: x.address,
    city: x.city,
    subscription_type: x.subscription,
    status: x.status,
    lat: x.lat,
    lng: x.lng,
    wallet_balance: x.wallet,
    total_orders: x.orders,
  }));

  void supabase.from("restaurants").upsert(payload, { onConflict: "id" });
};

export async function addRestaurant(data: Pick<Restaurant,'name'|'phone'|'pin'|'address'|'city'|'subscription'>): Promise<Restaurant> {
  const restaurants = [...restaurantsCache];
  const r: Restaurant = {
    ...data,
    id: crypto.randomUUID(),
    status: 'active', wallet: 0, orders: 0,
    lat: 30.0444 + (Math.random() - 0.5) * 0.08,
    lng: 31.2357 + (Math.random() - 0.5) * 0.08,
  };

  if (!supabase) {
    restaurantsCache = [...restaurants, r];
    return r;
  }

  const { data: inserted, error } = await supabase
    .from("restaurants")
    .insert({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      city: r.city,
      subscription_type: r.subscription,
      status: r.status,
      wallet_balance: r.wallet,
      total_orders: r.orders,
      lat: r.lat,
      lng: r.lng,
    })
    .select("*")
    .single();

  if (error && isSchemaCacheColumnError(error)) {
    const { data: legacyInserted, error: legacyError } = await supabase
      .from("restaurants")
      .insert({
        name: r.name,
        phone: r.phone,
        address: r.address,
        latitude: r.lat,
        longitude: r.lng,
      })
      .select("*")
      .single();

    if (legacyError) {
      throw new Error(legacyError.message || "تعذر حفظ بيانات المطعم في قاعدة البيانات");
    }

    const persistedLegacy = mapDbRestaurant(legacyInserted);
    persistedLegacy.pin = r.pin;
    restaurantsCache = [...restaurants, persistedLegacy];
    return persistedLegacy;
  }

  if (error) {
    throw new Error(error.message || "تعذر حفظ بيانات المطعم في قاعدة البيانات");
  }

  const persisted = mapDbRestaurant(inserted);
  persisted.pin = r.pin;
  restaurantsCache = [...restaurants, persisted];
  return persisted;
}

export function loginRestaurant(phone: string, pin: string): Restaurant | null {
  ensureFreshCache();
  const normalizedPhone = phone.trim();
  const normalizedPin = pin.trim();
  if (!normalizedPhone || !normalizedPin) return null;

  return (
    restaurantsCache.find(
      (r) =>
        r.phone === normalizedPhone &&
        // Seeded/legacy records use default PIN until auth module is completed.
        (r.pin ? r.pin === normalizedPin : normalizedPin === "1234"),
    ) ?? null
  );
}
