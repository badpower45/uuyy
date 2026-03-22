import { Platform } from "react-native";

let tenantId = (process.env.EXPO_PUBLIC_DEFAULT_TENANT || "pilot-main").toLowerCase();
let userRole: "driver" | "restaurant" | "admin" = "driver";

export function setApiTenantContext(ctx: {
  tenantId?: string;
  role?: "driver" | "restaurant" | "admin";
}) {
  if (ctx.tenantId) {
    tenantId = ctx.tenantId.trim().toLowerCase();
  }
  if (ctx.role) {
    userRole = ctx.role;
  }
}

export function getApiBaseUrl(): string {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  // Dev fallback
  if (Platform.OS === "web") {
    return "/api";
  }
  return process.env.EXPO_PUBLIC_PROD_API_BASE_URL || "https://driver-master-api.vercel.app/api";
}

const BASE_URL = getApiBaseUrl();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const optionHeaders = (options?.headers ?? {}) as Record<string, string>;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      "x-user-role": userRole,
      ...optionHeaders,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiDriver {
  id: number;
  name: string;
  phone: string;
  avatarLetter: string;
  rank: "bronze" | "silver" | "gold" | "platinum";
  balance: number;
  creditLimit: number;
  totalTrips: number;
  rating: number;
}

export interface ApiWeeklyEarning {
  date: string;
  isoDate: string;
  trips: number;
  earnings: number;
  cashCollected: number;
  commission: number;
}

export interface ApiOrder {
  id: number;
  externalId?: string;
  driverId?: number | null;
  status: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLatitude: number | null;
  customerLongitude: number | null;
  fare: number;
  cashToCollect: number;
  commission: number;
  distanceKm: number | null;
}

export interface ApiRouteStep {
  instruction: string;
  distanceM: number;
  durationSec: number;
}

export interface ApiOrderRoute {
  orderId: number;
  driverId: number | null;
  status: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLocation: { lat: number; lng: number } | null;
  customerName: string;
  customerAddress: string;
  customerLocation: { lat: number; lng: number };
  currentDestination: {
    label: string;
    latitude: number;
    longitude: number;
  };
  route: {
    provider: "google" | "mapbox" | "osrm";
    trafficAware: boolean;
    etaLabel: string;
    activeLegIndex: number;
    alternativeCount: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    polyline: [number, number][];
    fullPolyline: [number, number][];
    alternatives: Array<{
      distanceKm: number;
      durationMinutes: number;
    }>;
    legs: Array<{
      label: string;
      distanceKm: number;
      durationMinutes: number;
      steps: ApiRouteStep[];
      destination: { lat: number; lng: number };
      polyline: [number, number][];
      provider: "google" | "mapbox" | "osrm";
      trafficAware: boolean;
      alternativeCount: number;
    }>;
  };
}

export interface ApiTrackedDriverLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recordedAt: string;
  orderId: number | null;
}

export interface ApiOrderTracking {
  orderId: number;
  driverId: number | null;
  status: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLocation: { lat: number; lng: number } | null;
  customerName: string;
  customerAddress: string;
  customerLocation: { lat: number; lng: number } | null;
  trackingAvailable: boolean;
  driverLocation: ApiTrackedDriverLocation | null;
  currentDestination: {
    label: string;
    latitude: number;
    longitude: number;
  } | null;
  route: ApiOrderRoute["route"] | null;
}

export const apiClient = {
  // Driver
  getDriverByPhone: (phone: string) =>
    apiFetch<ApiDriver>(`/drivers/by-phone/${phone}`),

  getWeeklyEarnings: (driverId: number) =>
    apiFetch<ApiWeeklyEarning[]>(`/drivers/${driverId}/earnings/weekly`),

  recordEarning: (driverId: number, data: { amount: number; cashCollected: number; commission: number; orderId?: number }) =>
    apiFetch<{ id: number }>(`/drivers/${driverId}/earnings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveLocation: (driverId: number, data: { latitude: number; longitude: number; accuracy?: number | null; heading?: number | null; speed?: number | null; orderId?: number | null }) =>
    apiFetch<{ ok: boolean }>(`/drivers/${driverId}/location`, {
      method: "POST",
      body: JSON.stringify(data),
    }).catch(() => ({ ok: false as const })),

  // Orders
  getIncomingOrder: () =>
    apiFetch<ApiOrder | null>(`/orders/incoming`),

  getActiveOrder: (driverId: number) =>
    apiFetch<ApiOrder | null>(`/orders/active/${driverId}`),

  acceptOrder: (orderId: number, driverId: number) =>
    apiFetch<ApiOrder>(`/orders/${orderId}/accept`, {
      method: "POST",
      body: JSON.stringify({ driverId }),
    }),

  declineOrder: (orderId: number) =>
    apiFetch<{ ok: boolean }>(`/orders/${orderId}/decline`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  advanceOrderStatus: (orderId: number, status: string) =>
    apiFetch<{ id: number; status: string }>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Routing
  getOrderRoute: (params: { driverLat: number; driverLng: number; orderId: number }) =>
    apiFetch<ApiOrderRoute>(`/routing/order-route`, {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getOrderTracking: (orderId: number) =>
    apiFetch<ApiOrderTracking>(`/orders/${orderId}/tracking`),

  getEta: (driverLat: number, driverLng: number, destLat: number, destLng: number) =>
    apiFetch<{ distanceKm: number; durationMinutes: number; etaIso: string; etaLabel: string }>(
      `/routing/eta?driverLat=${driverLat}&driverLng=${driverLng}&destLat=${destLat}&destLng=${destLng}`
    ),
};
