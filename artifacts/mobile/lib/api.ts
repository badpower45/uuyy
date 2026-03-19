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

export const apiClient = {
  getDriverByPhone: (phone: string) =>
    apiFetch<ApiDriver>(`/drivers/by-phone/${phone}`),

  getWeeklyEarnings: (driverId: number) =>
    apiFetch<ApiWeeklyEarning[]>(`/drivers/${driverId}/earnings/weekly`),

  recordEarning: (driverId: number, data: { amount: number; cashCollected: number; commission: number; orderId?: number }) =>
    apiFetch<{ id: number }>(`/drivers/${driverId}/earnings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
