import { Router } from "express";
import { db, pool, driversTable, ordersTable, restaurantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getDrivingRoute } from "../lib/routing";

const router = Router();

type LatLng = { lat: number; lng: number };

type OrderRow = {
  id: number;
  driverId: number | null;
  status: string;
  customerName: string;
  customerAddress: string;
  customerLatitude: string | null;
  customerLongitude: string | null;
  restaurantName: string | null;
  restaurantAddress: string | null;
  restaurantLatitude: string | null;
  restaurantLongitude: string | null;
};

function parseCoordinate(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid coordinate");
  }
  return parsed;
}

function parseDbCoordinate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildEtaLabel(durationMinutes: number): string {
  const rounded = Math.max(1, Math.round(durationMinutes));
  return `${rounded} دقيقة`;
}

async function getOrderWithStops(orderId: number): Promise<OrderRow | null> {
  const rows = await db
    .select({
      id: ordersTable.id,
      driverId: ordersTable.driverId,
      status: ordersTable.status,
      customerName: ordersTable.customerName,
      customerAddress: ordersTable.customerAddress,
      customerLatitude: ordersTable.customerLatitude,
      customerLongitude: ordersTable.customerLongitude,
      restaurantName: restaurantsTable.name,
      restaurantAddress: restaurantsTable.address,
      restaurantLatitude: restaurantsTable.latitude,
      restaurantLongitude: restaurantsTable.longitude,
    })
    .from(ordersTable)
    .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  return rows[0] ?? null;
}

async function getLatestDriverLocation(driverId: number) {
  const rows = await pool.query(
    `SELECT latitude, longitude, accuracy, heading, speed, recorded_at, order_id
     FROM driver_locations
     WHERE driver_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [driverId]
  );

  if (!rows.rows.length) {
    return null;
  }

  const latest = rows.rows[0] as {
    latitude: string;
    longitude: string;
    accuracy: string | null;
    heading: string | null;
    speed: string | null;
    recorded_at: string;
    order_id: number | null;
  };

  return {
    latitude: Number(latest.latitude),
    longitude: Number(latest.longitude),
    accuracy: latest.accuracy ? Number(latest.accuracy) : null,
    heading: latest.heading ? Number(latest.heading) : null,
    speed: latest.speed ? Number(latest.speed) : null,
    recordedAt: latest.recorded_at,
    orderId: latest.order_id,
  };
}

async function buildOrderTrackingPayload(order: OrderRow, driverPos: LatLng) {
  const customerLat = parseDbCoordinate(order.customerLatitude);
  const customerLng = parseDbCoordinate(order.customerLongitude);
  if (customerLat == null || customerLng == null) {
    throw new Error("الطلبية لا تحتوي على إحداثيات الزبون");
  }

  const restaurantLat = parseDbCoordinate(order.restaurantLatitude);
  const restaurantLng = parseDbCoordinate(order.restaurantLongitude);
  const restaurantPos =
    restaurantLat != null && restaurantLng != null
      ? { lat: restaurantLat, lng: restaurantLng }
      : null;
  const customerPos = { lat: customerLat, lng: customerLng };

  const routeToRestaurantNeeded = order.status === "to_restaurant" && restaurantPos;
  const currentDestination = routeToRestaurantNeeded ? restaurantPos : customerPos;
  const currentLabel = routeToRestaurantNeeded ? "إلى المطعم" : "إلى الزبون";

  const [currentLeg, previewLeg] = await Promise.all([
    getDrivingRoute({
      origin: driverPos,
      destination: currentDestination,
      computeAlternatives: true,
      language: "ar",
    }),
    routeToRestaurantNeeded
      ? getDrivingRoute({
          origin: restaurantPos,
          destination: customerPos,
          language: "ar",
        })
      : Promise.resolve(null),
  ]);

  const legs = [
    {
      label: currentLabel,
      distanceKm: currentLeg.distanceKm,
      durationMinutes: currentLeg.durationMinutes,
      steps: currentLeg.steps,
      polyline: currentLeg.polyline,
      destination: currentDestination,
      provider: currentLeg.provider,
      trafficAware: currentLeg.trafficAware,
      alternativeCount: currentLeg.alternatives.length,
    },
  ];

  if (previewLeg) {
    legs.push({
      label: "من المطعم إلى الزبون",
      distanceKm: previewLeg.distanceKm,
      durationMinutes: previewLeg.durationMinutes,
      steps: previewLeg.steps,
      polyline: previewLeg.polyline,
      destination: customerPos,
      provider: previewLeg.provider,
      trafficAware: previewLeg.trafficAware,
      alternativeCount: previewLeg.alternatives.length,
    });
  }

  const totalDistanceKm = Number(
    legs.reduce((sum, leg) => sum + leg.distanceKm, 0).toFixed(2)
  );
  const totalDurationMinutes = Number(
    legs.reduce((sum, leg) => sum + leg.durationMinutes, 0).toFixed(1)
  );

  return {
    orderId: order.id,
    driverId: order.driverId,
    status: order.status,
    restaurantName: order.restaurantName ?? "مطعم",
    restaurantAddress: order.restaurantAddress ?? "",
    restaurantLocation: restaurantPos,
    customerName: order.customerName,
    customerAddress: order.customerAddress,
    customerLocation: customerPos,
    currentDestination: {
      label: currentLabel,
      latitude: currentDestination.lat,
      longitude: currentDestination.lng,
    },
    route: {
      provider: currentLeg.provider,
      trafficAware: currentLeg.trafficAware,
      etaLabel: buildEtaLabel(currentLeg.durationMinutes),
      activeLegIndex: 0,
      alternativeCount: currentLeg.alternatives.length,
      totalDistanceKm,
      totalDurationMinutes,
      polyline: currentLeg.polyline,
      fullPolyline: legs.flatMap((leg) => leg.polyline),
      alternatives: currentLeg.alternatives.map((alt) => ({
        distanceKm: alt.distanceKm,
        durationMinutes: alt.durationMinutes,
      })),
      legs,
    },
  };
}

// POST /api/routing/shortest-path
router.post("/routing/shortest-path", async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.body;

    if (originLat == null || originLng == null || destLat == null || destLng == null) {
      return res.status(400).json({ error: "يجب توفير originLat, originLng, destLat, destLng" });
    }

    const route = await getDrivingRoute({
      origin: { lat: parseCoordinate(originLat), lng: parseCoordinate(originLng) },
      destination: { lat: parseCoordinate(destLat), lng: parseCoordinate(destLng) },
      computeAlternatives: true,
      language: "ar",
    });

    return res.json({
      provider: route.provider,
      trafficAware: route.trafficAware,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      etaLabel: buildEtaLabel(route.durationMinutes),
      polyline: route.polyline,
      steps: route.steps,
      alternatives: route.alternatives.map((alt) => ({
        distanceKm: alt.distanceKm,
        durationMinutes: alt.durationMinutes,
      })),
    });
  } catch (err) {
    console.error("Routing error:", err);
    return res.status(500).json({ error: "فشل حساب الطريق" });
  }
});

// POST /api/routing/order-route
router.post("/routing/order-route", async (req, res) => {
  try {
    const { driverLat, driverLng, orderId } = req.body;

    if (driverLat == null || driverLng == null || orderId == null) {
      return res.status(400).json({ error: "يجب توفير driverLat, driverLng, orderId" });
    }

    const order = await getOrderWithStops(Number(orderId));
    if (!order) {
      return res.status(404).json({ error: "الطلبية غير موجودة" });
    }

    const payload = await buildOrderTrackingPayload(order, {
      lat: parseCoordinate(driverLat),
      lng: parseCoordinate(driverLng),
    });

    return res.json(payload);
  } catch (err) {
    console.error("Order route error:", err);
    return res.status(500).json({ error: "فشل حساب مسار الطلبية" });
  }
});

// GET /api/orders/:id/tracking
router.get("/orders/:id/tracking", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "رقم الطلبية غير صحيح" });
    }

    const order = await getOrderWithStops(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلبية غير موجودة" });
    }

    let driverLocation = null;
    if (order.driverId) {
      driverLocation = await getLatestDriverLocation(order.driverId);
    }

    const routePayload = driverLocation
      ? await buildOrderTrackingPayload(order, {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        })
      : null;

    return res.json({
      orderId: order.id,
      driverId: order.driverId,
      status: order.status,
      restaurantName: order.restaurantName ?? "مطعم",
      restaurantAddress: order.restaurantAddress ?? "",
      restaurantLocation: routePayload?.restaurantLocation ?? null,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerLocation: routePayload?.customerLocation ?? null,
      driverLocation,
      trackingAvailable: Boolean(driverLocation),
      route: routePayload?.route ?? null,
      currentDestination: routePayload?.currentDestination ?? null,
    });
  } catch (err) {
    console.error("Order tracking error:", err);
    return res.status(500).json({ error: "فشل جلب تتبع الطلبية" });
  }
});

// POST /api/routing/multi-stop
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

    const result = await getDrivingRoute({
      origin,
      destination,
      waypoints,
      computeAlternatives: true,
      language: "ar",
    });

    return res.json({
      provider: result.provider,
      trafficAware: result.trafficAware,
      totalDistanceKm: result.distanceKm,
      totalDurationMinutes: result.durationMinutes,
      etaLabel: buildEtaLabel(result.durationMinutes),
      polyline: result.polyline,
      steps: result.steps,
      alternatives: result.alternatives.map((alt) => ({
        distanceKm: alt.distanceKm,
        durationMinutes: alt.durationMinutes,
      })),
      stops: stops.map((stop, index) => ({
        index,
        label: stop.label ?? `نقطة ${index + 1}`,
        lat: stop.lat,
        lng: stop.lng,
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
        parseCoordinate(latitude),
        parseCoordinate(longitude),
        accuracy == null ? null : parseCoordinate(accuracy),
        heading == null ? null : parseCoordinate(heading),
        speed == null ? null : parseCoordinate(speed),
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

    const latest = await getLatestDriverLocation(driverId);
    if (!latest) {
      return res.status(404).json({ error: "لا يوجد موقع مسجل لهذا السواق" });
    }

    return res.json(latest);
  } catch (err) {
    console.error("Get location error:", err);
    return res.status(500).json({ error: "فشل جلب الموقع" });
  }
});

// GET /api/routing/eta
router.get("/routing/eta", async (req, res) => {
  try {
    const { driverLat, driverLng, destLat, destLng } = req.query as Record<string, string>;

    if (!driverLat || !driverLng || !destLat || !destLng) {
      return res.status(400).json({ error: "يجب توفير driverLat, driverLng, destLat, destLng" });
    }

    const route = await getDrivingRoute({
      origin: { lat: parseCoordinate(driverLat), lng: parseCoordinate(driverLng) },
      destination: { lat: parseCoordinate(destLat), lng: parseCoordinate(destLng) },
      language: "ar",
    });

    const eta = new Date(Date.now() + route.durationMinutes * 60 * 1000);

    return res.json({
      provider: route.provider,
      trafficAware: route.trafficAware,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      etaIso: eta.toISOString(),
      etaLabel: buildEtaLabel(route.durationMinutes),
    });
  } catch (err) {
    console.error("ETA error:", err);
    return res.status(500).json({ error: "فشل حساب وقت الوصول" });
  }
});

export default router;
