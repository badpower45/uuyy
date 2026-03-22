import { Platform } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";
const TRACKING_CONTEXT_KEY = "driver-master:tracking-context";

type TrackingContext = {
  apiBaseUrl: string;
  driverId: number;
  orderId: number | null;
};

// Location update callback — set from AppContext
let onLocationUpdate: ((loc: Location.LocationObject) => void) | null = null;

export function setLocationUpdateCallback(
  cb: (loc: Location.LocationObject) => void
) {
  onLocationUpdate = cb;
}

export async function setBackgroundTrackingContext(ctx: TrackingContext) {
  await AsyncStorage.setItem(TRACKING_CONTEXT_KEY, JSON.stringify(ctx));
}

export async function clearBackgroundTrackingContext() {
  await AsyncStorage.removeItem(TRACKING_CONTEXT_KEY);
}

async function postLocationUpdate(loc: Location.LocationObject) {
  const raw = await AsyncStorage.getItem(TRACKING_CONTEXT_KEY);
  if (!raw) return;

  const ctx = JSON.parse(raw) as TrackingContext;
  await fetch(`${ctx.apiBaseUrl}/drivers/${ctx.driverId}/location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      heading: loc.coords.heading,
      speed: loc.coords.speed,
      orderId: ctx.orderId,
    }),
  });
}

// Background tasks only work on native (iOS/Android dev builds)
if (Platform.OS !== "web") {
  // Dynamic import to avoid crashing on web
  const TaskManager = require("expo-task-manager");

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }: any) => {
    if (error) {
      console.error("[BackgroundLocation] Error:", error.message);
      return;
    }
    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const latest = locations[locations.length - 1];
      if (latest && onLocationUpdate) {
        onLocationUpdate(latest);
      }
      if (latest) {
        postLocationUpdate(latest).catch((taskErr) => {
          console.error("[BackgroundLocation] Upload failed:", taskErr);
        });
      }
    }
  });
}
