import { Platform } from "react-native";
import * as Location from "expo-location";

export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// Location update callback — set from AppContext
let onLocationUpdate: ((loc: Location.LocationObject) => void) | null = null;

export function setLocationUpdateCallback(
  cb: (loc: Location.LocationObject) => void
) {
  onLocationUpdate = cb;
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
      // TODO in production: POST to API server
      // fetch(`${process.env.EXPO_PUBLIC_API_URL}/driver/location`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     latitude: latest.coords.latitude,
      //     longitude: latest.coords.longitude,
      //     accuracy: latest.coords.accuracy,
      //     heading: latest.coords.heading,
      //     speed: latest.coords.speed,
      //     timestamp: latest.timestamp,
      //   }),
      // });
    }
  });
}
