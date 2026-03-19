import { Platform } from "react-native";

function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api`;
  }
  // Dev fallback
  if (Platform.OS === "web") {
    return "/api";
  }
  return "http://localhost:8080/api";
}

const BASE_URL = getBaseUrl();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
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
  distanceKm: number | null;
}

export interface ApiRouteStep {
  instruction: string;
  distanceM: number;
  durationSec: number;
}

export interface ApiOrderRoute {
  orderId: number;
  status: string;
  customerName: string;
  customerAddress: string;
  route: {
    totalDistanceKm: number;
    totalDurationMinutes: number;
    polyline: [number, number][];
    legs: Array<{
      label: string;
      distanceKm: number;
      durationMinutes: number;
      steps: ApiRouteStep[];
      destination: { lat: number; lng: number };
    }>;
  };
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

  getEta: (driverLat: number, driverLng: number, destLat: number, destLng: number) =>
    apiFetch<{ distanceKm: number; durationMinutes: number; etaIso: string; etaLabel: string }>(
      `/routing/eta?driverLat=${driverLat}&driverLng=${driverLng}&destLat=${destLat}&destLng=${destLng}`
    ),
};
