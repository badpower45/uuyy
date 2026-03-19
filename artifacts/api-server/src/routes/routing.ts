import { Router } from "express";
import { db, pool, driversTable, ordersTable, restaurantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

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
  waypoints: Array<{
    name: string;
    location: [number, number];
    distance: number;
  }>;
}

function formatManeuver(step: OSRMStep): string {
  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;
  const name = step.name ? `على ${step.name}` : "";

  if (type === "depart") return `ابدأ ${name}`;
  if (type === "arrive") return `وصلت إلى الوجهة`;
  if (type === "turn") {
    if (modifier === "left") return `انعطف يسار ${name}`;
    if (modifier === "right") return `انعطف يمين ${name}`;
    if (modifier === "sharp left") return `انعطف يسار حاد ${name}`;
    if (modifier === "sharp right") return `انعطف يمين حاد ${name}`;
    if (modifier === "slight left") return `انحرف يسار ${name}`;
    if (modifier === "slight right") return `انحرف يمين ${name}`;
    if (modifier === "uturn") return `استدر ${name}`;
    return `استمر ${name}`;
  }
  if (type === "new name") return `استمر ${name}`;
  if (type === "merge") return `ادمج على ${name}`;
  if (type === "on ramp") return `اصعد على ${name}`;
  if (type === "off ramp") return `انزل من ${name}`;
  if (type === "fork") {
    if (modifier === "left") return `خذ يسار ${name}`;
    if (modifier === "right") return `خذ يمين ${name}`;
    return `في المفترق ${name}`;
  }
  if (type === "roundabout" || type === "rotary") return `ادخل الدوار ثم اخرج ${name}`;
  if (type === "continue") return `استمر ${name}`;
  if (type === "end of road") {
    if (modifier === "left") return `في نهاية الطريق انعطف يسار ${name}`;
    if (modifier === "right") return `في نهاية الطريق انعطف يمين ${name}`;
    return `في نهاية الطريق ${name}`;
  }
  return `استمر ${name}`;
}

async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: Array<{ lat: number; lng: number }> = []
): Promise<{
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][];
  steps: Array<{ instruction: string; distanceM: number; durationSec: number }>;
}> {
  const points = [origin, ...waypoints, destination];
  const coordString = points
    .map((p) => `${p.lng},${p.lat}`)
    .join(";");

  const url = `${OSRM_BASE}/${coordString}?steps=true&geometries=geojson&overview=full&annotations=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as OSRMResponse;

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM returned no routes: ${data.code}`);
  }

  const route = data.routes[0];
  const polyline = route.geometry.coordinates as [number, number][];

  const steps: Array<{ instruction: string; distanceM: number; durationSec: number }> = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      steps.push({
        instruction: formatManeuver(step),
        distanceM: Math.round(step.distance),
        durationSec: Math.round(step.duration),
      });
    }
  }

  return {
    distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
    durationMinutes: parseFloat((route.duration / 60).toFixed(1)),
    polyline,
    steps,
  };
}

// POST /api/routing/shortest-path
// Body: { originLat, originLng, destLat, destLng }
router.post("/routing/shortest-path", async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;

    if (
      originLat == null || originLng == null ||
      destLat == null || destLng == null
    ) {
      return res.status(400).json({ error: "يجب توفير originLat, originLng, destLat, destLng" });
    }

    const result = await getRoute(
      { lat: parseFloat(originLat), lng: parseFloat(originLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) }
    );

    return res.json({
      distanceKm: result.distanceKm,
      durationMinutes: result.durationMinutes,
      polyline: result.polyline,
      steps: result.steps,
    });
  } catch (err) {
    console.error("Routing error:", err);
    return res.status(500).json({ error: "فشل حساب الطريق" });
  }
});

// POST /api/routing/order-route
// Body: { driverLat, driverLng, orderId }
// Returns: full route driver → restaurant → customer with both legs
router.post("/routing/order-route", async (req, res) => {
  try {
    const { driverLat, driverLng, orderId } = req.body;

    if (driverLat == null || driverLng == null || orderId == null) {
      return res.status(400).json({ error: "يجب توفير driverLat, driverLng, orderId" });
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, parseInt(orderId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "الطلبية غير موجودة" });
    }

    if (!order.customerLatitude || !order.customerLongitude) {
      return res.status(400).json({ error: "الطلبية لا تحتوي على إحداثيات الزبون" });
    }

    const driverPos = { lat: parseFloat(driverLat), lng: parseFloat(driverLng) };
    const customerPos = {
      lat: parseFloat(order.customerLatitude),
      lng: parseFloat(order.customerLongitude),
    };

    let restaurantPos: { lat: number; lng: number } | null = null;
    if (order.restaurantId) {
      const [restaurant] = await db
        .select()
        .from(restaurantsTable)
        .where(eq(restaurantsTable.id, order.restaurantId))
        .limit(1);
      if (restaurant?.latitude && restaurant?.longitude) {
        restaurantPos = {
          lat: parseFloat(restaurant.latitude),
          lng: parseFloat(restaurant.longitude),
        };
      }
    }

    if (restaurantPos) {
      // Full route: driver → restaurant → customer
      const [legToRestaurant, legToCustomer] = await Promise.all([
        getRoute(driverPos, restaurantPos),
        getRoute(restaurantPos, customerPos),
      ]);

      const fullPolyline = [...legToRestaurant.polyline, ...legToCustomer.polyline];

      return res.json({
        orderId: order.id,
        status: order.status,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        route: {
          totalDistanceKm: parseFloat(
            (legToRestaurant.distanceKm + legToCustomer.distanceKm).toFixed(2)
          ),
          totalDurationMinutes: parseFloat(
            (legToRestaurant.durationMinutes + legToCustomer.durationMinutes).toFixed(1)
          ),
          polyline: fullPolyline,
          legs: [
            {
              label: "إلى المطعم",
              distanceKm: legToRestaurant.distanceKm,
              durationMinutes: legToRestaurant.durationMinutes,
              steps: legToRestaurant.steps,
              destination: restaurantPos,
            },
            {
              label: "إلى الزبون",
              distanceKm: legToCustomer.distanceKm,
              durationMinutes: legToCustomer.durationMinutes,
              steps: legToCustomer.steps,
              destination: customerPos,
            },
          ],
        },
      });
    } else {
      // Only driver → customer (no restaurant location)
      const result = await getRoute(driverPos, customerPos);

      return res.json({
        orderId: order.id,
        status: order.status,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        route: {
          totalDistanceKm: result.distanceKm,
          totalDurationMinutes: result.durationMinutes,
          polyline: result.polyline,
          legs: [
            {
              label: "إلى الزبون",
              distanceKm: result.distanceKm,
              durationMinutes: result.durationMinutes,
              steps: result.steps,
              destination: customerPos,
            },
          ],
        },
      });
    }
  } catch (err) {
    console.error("Order route error:", err);
    return res.status(500).json({ error: "فشل حساب مسار الطلبية" });
  }
});

// POST /api/routing/multi-stop
// Body: { stops: [{lat, lng, label}] } — optimizes order of stops
router.post("/routing/multi-stop", async (req, res) => {
  try {
    const { stops } = req.body as {
      stops: Array<{ lat: number; lng: number; label?: string }>;
    };

    if (!stops || stops.length < 2) {
      return res.status(400).json({ error: "يجب توفير نقطتين على الأقل" });
    }
    if (stops.length > 10) {
      return res.status(400).json({ error: "الحد الأقصى 10 نقاط توقف" });
    }

    const origin = stops[0];
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);

    const result = await getRoute(origin, destination, waypoints);

    return res.json({
      totalDistanceKm: result.distanceKm,
      totalDurationMinutes: result.durationMinutes,
      polyline: result.polyline,
      steps: result.steps,
      stops: stops.map((s, i) => ({
        index: i,
        label: s.label ?? `نقطة ${i + 1}`,
        lat: s.lat,
        lng: s.lng,
      })),
    });
  } catch (err) {
    console.error("Multi-stop route error:", err);
    return res.status(500).json({ error: "فشل حساب المسار متعدد المحطات" });
  }
});

// POST /api/drivers/:id/location — save GPS ping
router.post("/drivers/:id/location", async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: "رقم السواق غير صحيح" });
    }

    const { latitude, longitude, accuracy, heading, speed, orderId } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: "يجب توفير latitude و longitude" });
    }

    await pool.query(
      `INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, accuracy, heading, speed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        driverId,
        orderId ?? null,
        parseFloat(latitude),
        parseFloat(longitude),
        accuracy ? parseFloat(accuracy) : null,
        heading ? parseFloat(heading) : null,
        speed ? parseFloat(speed) : null,
      ]
    );

    await db
      .update(driversTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(driversTable.id, driverId));

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Save location error:", err);
    return res.status(500).json({ error: "فشل حفظ الموقع" });
  }
});

// GET /api/drivers/:id/location — get latest driver location
router.get("/drivers/:id/location", async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: "رقم السواق غير صحيح" });
    }

    const rows = await pool.query(
      `SELECT latitude, longitude, accuracy, heading, speed, recorded_at, order_id
       FROM driver_locations
       WHERE driver_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [driverId]
    );

    if (!rows.rows.length) {
      return res.status(404).json({ error: "لا يوجد موقع مسجل لهذا السواق" });
    }

    const loc = rows.rows[0] as {
      latitude: string;
      longitude: string;
      accuracy: string | null;
      heading: string | null;
      speed: string | null;
      recorded_at: string;
      order_id: number | null;
    };

    return res.json({
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
      heading: loc.heading ? parseFloat(loc.heading) : null,
      speed: loc.speed ? parseFloat(loc.speed) : null,
      recordedAt: loc.recorded_at,
      orderId: loc.order_id,
    });
  } catch (err) {
    console.error("Get location error:", err);
    return res.status(500).json({ error: "فشل جلب الموقع" });
  }
});

// GET /api/routing/eta — calculate ETA from driver to order destination
// Query: driverLat, driverLng, destLat, destLng
router.get("/routing/eta", async (req, res) => {
  try {
    const { driverLat, driverLng, destLat, destLng } = req.query as Record<string, string>;

    if (!driverLat || !driverLng || !destLat || !destLng) {
      return res.status(400).json({ error: "يجب توفير driverLat, driverLng, destLat, destLng" });
    }

    const result = await getRoute(
      { lat: parseFloat(driverLat), lng: parseFloat(driverLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) }
    );

    const eta = new Date(Date.now() + result.durationMinutes * 60 * 1000);

    return res.json({
      distanceKm: result.distanceKm,
      durationMinutes: result.durationMinutes,
      etaIso: eta.toISOString(),
      etaLabel: `${Math.round(result.durationMinutes)} دقيقة`,
    });
  } catch (err) {
    console.error("ETA error:", err);
    return res.status(500).json({ error: "فشل حساب وقت الوصول" });
  }
});

export default router;
