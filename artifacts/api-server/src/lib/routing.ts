type LatLng = { lat: number; lng: number };

export interface RouteStep {
  instruction: string;
  distanceM: number;
  durationSec: number;
}

export interface RouteLegResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][];
  steps: RouteStep[];
}

export interface RouteResult extends RouteLegResult {
  provider: "google" | "mapbox" | "osrm";
  trafficAware: boolean;
  alternatives: Array<{
    distanceKm: number;
    durationMinutes: number;
    polyline: [number, number][];
  }>;
}

type RoutingProvider = RouteResult["provider"];

interface GetDrivingRouteParams {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  language?: string;
  computeAlternatives?: boolean;
}

interface GoogleComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
      geoJsonLinestring?: { coordinates?: [number, number][] };
    };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: {
        encodedPolyline?: string;
        geoJsonLinestring?: { coordinates?: [number, number][] };
      };
      steps?: Array<{
        distanceMeters?: number;
        staticDuration?: string;
        navigationInstruction?: {
          instructions?: string;
        };
      }>;
    }>;
  }>;
}

interface MapboxDirectionsResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
    legs?: Array<{
      distance: number;
      duration: number;
      steps?: Array<{
        distance: number;
        duration: number;
        maneuver?: {
          instruction?: string;
        };
      }>;
    }>;
  }>;
}

interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_before: number;
    bearing_after: number;
    location: [number, number];
  };
}

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  legs: Array<{
    distance: number;
    duration: number;
    steps: OSRMStep[];
  }>;
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function roundKm(meters: number | undefined): number {
  return Number(((meters ?? 0) / 1000).toFixed(2));
}

function roundMinutes(seconds: number | undefined): number {
  return Number(((seconds ?? 0) / 60).toFixed(1));
}

function parseGoogleDurationSeconds(value?: string): number {
  if (!value) return 0;
  const cleaned = value.endsWith("s") ? value.slice(0, -1) : value;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodePolyline(encoded: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

function formatOsrmManeuver(step: OSRMStep): string {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;
  const name = step.name ? `على ${step.name}` : "";

  if (type === "depart") return `ابدأ ${name}`.trim();
  if (type === "arrive") return "وصلت إلى الوجهة";
  if (type === "turn") {
    if (modifier === "left") return `انعطف يسار ${name}`.trim();
    if (modifier === "right") return `انعطف يمين ${name}`.trim();
    if (modifier === "sharp left") return `انعطف يسار حاد ${name}`.trim();
    if (modifier === "sharp right") return `انعطف يمين حاد ${name}`.trim();
    if (modifier === "slight left") return `انحرف يسار ${name}`.trim();
    if (modifier === "slight right") return `انحرف يمين ${name}`.trim();
    if (modifier === "uturn") return `استدر ${name}`.trim();
    return `استمر ${name}`.trim();
  }
  if (type === "new name") return `استمر ${name}`.trim();
  if (type === "merge") return `ادمج على ${name}`.trim();
  if (type === "on ramp") return `اصعد على ${name}`.trim();
  if (type === "off ramp") return `انزل من ${name}`.trim();
  if (type === "fork") {
    if (modifier === "left") return `خذ يسار ${name}`.trim();
    if (modifier === "right") return `خذ يمين ${name}`.trim();
    return `في المفترق ${name}`.trim();
  }
  if (type === "roundabout" || type === "rotary") return `ادخل الدوار ثم اخرج ${name}`.trim();
  if (type === "continue") return `استمر ${name}`.trim();
  if (type === "end of road") {
    if (modifier === "left") return `في نهاية الطريق انعطف يسار ${name}`.trim();
    if (modifier === "right") return `في نهاية الطريق انعطف يمين ${name}`.trim();
    return `في نهاية الطريق ${name}`.trim();
  }
  return `استمر ${name}`.trim();
}

function pickProvider(): RoutingProvider {
  const configured = (process.env.ROUTING_PROVIDER ?? "auto").trim().toLowerCase();
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (configured === "google") {
    if (!googleKey) {
      throw new Error("ROUTING_PROVIDER=google requires GOOGLE_MAPS_API_KEY");
    }
    return "google";
  }

  if (configured === "mapbox") {
    if (!mapboxToken) {
      throw new Error("ROUTING_PROVIDER=mapbox requires MAPBOX_ACCESS_TOKEN");
    }
    return "mapbox";
  }

  if (configured === "osrm") {
    return "osrm";
  }

  if (googleKey) return "google";
  if (mapboxToken) return "mapbox";
  return "osrm";
}

async function getGoogleRoute(params: GetDrivingRouteParams): Promise<RouteResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing");
  }

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "routes.distanceMeters",
        "routes.duration",
        "routes.polyline.encodedPolyline",
        "routes.legs.distanceMeters",
        "routes.legs.duration",
        "routes.legs.polyline.encodedPolyline",
        "routes.legs.steps.distanceMeters",
        "routes.legs.steps.staticDuration",
        "routes.legs.steps.navigationInstruction.instructions",
      ].join(","),
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: params.origin.lat, longitude: params.origin.lng } } },
      destination: { location: { latLng: { latitude: params.destination.lat, longitude: params.destination.lng } } },
      intermediates: (params.waypoints ?? []).map((point) => ({
        location: { latLng: { latitude: point.lat, longitude: point.lng } },
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      trafficModel: "BEST_GUESS",
      computeAlternativeRoutes: params.computeAlternatives ?? false,
      languageCode: params.language ?? "ar",
      units: "METRIC",
      polylineQuality: "HIGH_QUALITY",
      polylineEncoding: "ENCODED_POLYLINE",
      departureTime: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Routes request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as GoogleComputeRoutesResponse;
  if (!data.routes?.length) {
    throw new Error("Google Routes returned no routes");
  }

  const primary = data.routes[0];
  const steps: RouteStep[] = [];

  for (const leg of primary.legs ?? []) {
    for (const step of leg.steps ?? []) {
      steps.push({
        instruction: step.navigationInstruction?.instructions?.trim() || "استمر",
        distanceM: Math.round(step.distanceMeters ?? 0),
        durationSec: Math.round(parseGoogleDurationSeconds(step.staticDuration)),
      });
    }
  }

  return {
    provider: "google",
    trafficAware: true,
    distanceKm: roundKm(primary.distanceMeters),
    durationMinutes: roundMinutes(parseGoogleDurationSeconds(primary.duration)),
    polyline: primary.polyline?.encodedPolyline
      ? decodePolyline(primary.polyline.encodedPolyline)
      : [],
    steps,
    alternatives: data.routes.slice(1).map((route) => ({
      distanceKm: roundKm(route.distanceMeters),
      durationMinutes: roundMinutes(parseGoogleDurationSeconds(route.duration)),
      polyline: route.polyline?.encodedPolyline
        ? decodePolyline(route.polyline.encodedPolyline)
        : [],
    })),
  };
}

async function getMapboxRoute(params: GetDrivingRouteParams): Promise<RouteResult> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN is missing");
  }

  const coordinates = [params.origin, ...(params.waypoints ?? []), params.destination]
    .map((point) => `${point.lng},${point.lat}`)
    .join(";");

  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("alternatives", params.computeAlternatives ? "true" : "false");
  url.searchParams.set("steps", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("language", params.language ?? "ar");
  url.searchParams.set("depart_at", "now");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox Directions request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`Mapbox returned no routes: ${data.code}`);
  }

  const primary = data.routes[0];
  const steps: RouteStep[] = [];

  for (const leg of primary.legs ?? []) {
    for (const step of leg.steps ?? []) {
      steps.push({
        instruction: step.maneuver?.instruction?.trim() || "استمر",
        distanceM: Math.round(step.distance),
        durationSec: Math.round(step.duration),
      });
    }
  }

  return {
    provider: "mapbox",
    trafficAware: true,
    distanceKm: roundKm(primary.distance),
    durationMinutes: roundMinutes(primary.duration),
    polyline: primary.geometry?.coordinates ?? [],
    steps,
    alternatives: data.routes.slice(1).map((route) => ({
      distanceKm: roundKm(route.distance),
      durationMinutes: roundMinutes(route.duration),
      polyline: route.geometry?.coordinates ?? [],
    })),
  };
}

async function getOsrmRoute(params: GetDrivingRouteParams): Promise<RouteResult> {
  const points = [params.origin, ...(params.waypoints ?? []), params.destination];
  const coordString = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `${OSRM_BASE}/${coordString}?steps=true&geometries=geojson&overview=full&annotations=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OSRMResponse;
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM returned no routes: ${data.code}`);
  }

  const route = data.routes[0];
  const steps: RouteStep[] = [];

  for (const leg of route.legs) {
    for (const step of leg.steps) {
      steps.push({
        instruction: formatOsrmManeuver(step),
        distanceM: Math.round(step.distance),
        durationSec: Math.round(step.duration),
      });
    }
  }

  return {
    provider: "osrm",
    trafficAware: false,
    distanceKm: roundKm(route.distance),
    durationMinutes: roundMinutes(route.duration),
    polyline: route.geometry.coordinates,
    steps,
    alternatives: [],
  };
}

export function getRoutingProviderMeta(): { provider: RoutingProvider; trafficAware: boolean } {
  const provider = pickProvider();
  return {
    provider,
    trafficAware: provider !== "osrm",
  };
}

export async function getDrivingRoute(params: GetDrivingRouteParams): Promise<RouteResult> {
  const provider = pickProvider();

  if (provider === "google") {
    return getGoogleRoute(params);
  }

  if (provider === "mapbox") {
    return getMapboxRoute(params);
  }

  return getOsrmRoute(params);
}
