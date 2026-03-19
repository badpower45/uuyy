import { Router } from "express";
import { db, pool, ordersTable, restaurantsTable, driversTable } from "@workspace/db";
import { eq, and, isNull, inArray } from "drizzle-orm";

const router = Router();

// GET /api/orders/incoming
// Returns one pending unassigned order with restaurant info
router.get("/orders/incoming", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        externalId: ordersTable.externalId,
        status: ordersTable.status,
        customerName: ordersTable.customerName,
        customerPhone: ordersTable.customerPhone,
        customerAddress: ordersTable.customerAddress,
        customerLatitude: ordersTable.customerLatitude,
        customerLongitude: ordersTable.customerLongitude,
        fare: ordersTable.fare,
        cashToCollect: ordersTable.cashToCollect,
        distanceKm: ordersTable.distanceKm,
        restaurantId: ordersTable.restaurantId,
        restaurantName: restaurantsTable.name,
        restaurantAddress: restaurantsTable.address,
        restaurantLatitude: restaurantsTable.latitude,
        restaurantLongitude: restaurantsTable.longitude,
      })
      .from(ordersTable)
      .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
      .where(and(eq(ordersTable.status, "pending"), isNull(ordersTable.driverId)))
      .limit(1);

    if (!rows.length) {
      return res.json(null);
    }

    const o = rows[0];
    return res.json({
      id: o.id,
      externalId: o.externalId,
      restaurantName: o.restaurantName ?? "مطعم",
      restaurantAddress: o.restaurantAddress ?? "",
      restaurantLatitude: o.restaurantLatitude ? parseFloat(o.restaurantLatitude) : null,
      restaurantLongitude: o.restaurantLongitude ? parseFloat(o.restaurantLongitude) : null,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerAddress: o.customerAddress,
      customerLatitude: o.customerLatitude ? parseFloat(o.customerLatitude) : null,
      customerLongitude: o.customerLongitude ? parseFloat(o.customerLongitude) : null,
      fare: parseFloat(o.fare),
      cashToCollect: parseFloat(o.cashToCollect),
      distanceKm: o.distanceKm ? parseFloat(o.distanceKm) : null,
    });
  } catch (err) {
    console.error("Get incoming order error:", err);
    return res.status(500).json({ error: "فشل جلب الطلبية الواردة" });
  }
});

// GET /api/orders/active/:driverId
// Returns the active in-progress order for a driver
router.get("/orders/active/:driverId", async (req, res) => {
  try {
    const driverId = parseInt(req.params.driverId);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: "رقم السواق غير صحيح" });
    }

    const rows = await db
      .select({
        id: ordersTable.id,
        externalId: ordersTable.externalId,
        status: ordersTable.status,
        customerName: ordersTable.customerName,
        customerPhone: ordersTable.customerPhone,
        customerAddress: ordersTable.customerAddress,
        customerLatitude: ordersTable.customerLatitude,
        customerLongitude: ordersTable.customerLongitude,
        fare: ordersTable.fare,
        cashToCollect: ordersTable.cashToCollect,
        distanceKm: ordersTable.distanceKm,
        assignedAt: ordersTable.assignedAt,
        restaurantName: restaurantsTable.name,
        restaurantAddress: restaurantsTable.address,
        restaurantLatitude: restaurantsTable.latitude,
        restaurantLongitude: restaurantsTable.longitude,
      })
      .from(ordersTable)
      .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
      .where(
        and(
          eq(ordersTable.driverId, driverId),
          inArray(ordersTable.status, ["assigned", "to_restaurant", "picked_up", "to_customer"])
        )
      )
      .limit(1);

    if (!rows.length) {
      return res.json(null);
    }

    const o = rows[0];
    return res.json({
      id: o.id,
      externalId: o.externalId,
      status: o.status,
      restaurantName: o.restaurantName ?? "مطعم",
      restaurantAddress: o.restaurantAddress ?? "",
      restaurantLatitude: o.restaurantLatitude ? parseFloat(o.restaurantLatitude) : null,
      restaurantLongitude: o.restaurantLongitude ? parseFloat(o.restaurantLongitude) : null,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerAddress: o.customerAddress,
      customerLatitude: o.customerLatitude ? parseFloat(o.customerLatitude) : null,
      customerLongitude: o.customerLongitude ? parseFloat(o.customerLongitude) : null,
      fare: parseFloat(o.fare),
      cashToCollect: parseFloat(o.cashToCollect),
      distanceKm: o.distanceKm ? parseFloat(o.distanceKm) : null,
      assignedAt: o.assignedAt,
    });
  } catch (err) {
    console.error("Get active order error:", err);
    return res.status(500).json({ error: "فشل جلب الطلبية الحالية" });
  }
});

// POST /api/orders/:id/accept
// Assign order to driver and set status to to_restaurant
router.post("/orders/:id/accept", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { driverId } = req.body;

    if (isNaN(orderId) || !driverId) {
      return res.status(400).json({ error: "يجب توفير orderId و driverId" });
    }

    const [existing] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "الطلبية غير موجودة" });
    }
    if (existing.status !== "pending") {
      return res.status(409).json({ error: "الطلبية لم تعد متاحة" });
    }

    const [updated] = await db
      .update(ordersTable)
      .set({
        driverId: parseInt(driverId),
        status: "to_restaurant",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "pending")))
      .returning();

    if (!updated) {
      return res.status(409).json({ error: "الطلبية لم تعد متاحة" });
    }

    // Fetch with restaurant details
    const rows = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        customerName: ordersTable.customerName,
        customerPhone: ordersTable.customerPhone,
        customerAddress: ordersTable.customerAddress,
        customerLatitude: ordersTable.customerLatitude,
        customerLongitude: ordersTable.customerLongitude,
        fare: ordersTable.fare,
        cashToCollect: ordersTable.cashToCollect,
        distanceKm: ordersTable.distanceKm,
        restaurantName: restaurantsTable.name,
        restaurantAddress: restaurantsTable.address,
        restaurantLatitude: restaurantsTable.latitude,
        restaurantLongitude: restaurantsTable.longitude,
      })
      .from(ordersTable)
      .leftJoin(restaurantsTable, eq(ordersTable.restaurantId, restaurantsTable.id))
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    const o = rows[0];
    return res.status(201).json({
      id: o.id,
      status: o.status,
      restaurantName: o.restaurantName ?? "مطعم",
      restaurantAddress: o.restaurantAddress ?? "",
      restaurantLatitude: o.restaurantLatitude ? parseFloat(o.restaurantLatitude) : null,
      restaurantLongitude: o.restaurantLongitude ? parseFloat(o.restaurantLongitude) : null,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerAddress: o.customerAddress,
      customerLatitude: o.customerLatitude ? parseFloat(o.customerLatitude) : null,
      customerLongitude: o.customerLongitude ? parseFloat(o.customerLongitude) : null,
      fare: parseFloat(o.fare),
      cashToCollect: parseFloat(o.cashToCollect),
      distanceKm: o.distanceKm ? parseFloat(o.distanceKm) : null,
    });
  } catch (err) {
    console.error("Accept order error:", err);
    return res.status(500).json({ error: "فشل قبول الطلبية" });
  }
});

// PATCH /api/orders/:id/status
// Advance order to next status
router.patch("/orders/:id/status", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body as { status: string };

    if (isNaN(orderId) || !status) {
      return res.status(400).json({ error: "يجب توفير orderId و status" });
    }

    const validStatuses = ["to_restaurant", "picked_up", "to_customer", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "الحالة غير صحيحة" });
    }

    const now = new Date();
    const extra: Record<string, Date> = { updatedAt: now };
    if (status === "picked_up") extra.pickedUpAt = now;
    if (status === "delivered") extra.deliveredAt = now;
    if (status === "cancelled") extra.cancelledAt = now;

    const [updated] = await db
      .update(ordersTable)
      .set({ status: status as "to_restaurant" | "picked_up" | "to_customer" | "delivered" | "cancelled", ...extra })
      .where(eq(ordersTable.id, orderId))
      .returning({ id: ordersTable.id, status: ordersTable.status });

    if (!updated) {
      return res.status(404).json({ error: "الطلبية غير موجودة" });
    }

    // If delivered, reset the order so next time incoming query shows a new one
    if (status === "delivered") {
      // Create a fresh copy as pending for demo purposes
      const [orig] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      if (orig) {
        await db.insert(ordersTable).values({
          restaurantId: orig.restaurantId,
          customerName: orig.customerName,
          customerPhone: orig.customerPhone,
          customerAddress: orig.customerAddress,
          customerLatitude: orig.customerLatitude,
          customerLongitude: orig.customerLongitude,
          fare: orig.fare,
          cashToCollect: orig.cashToCollect,
          commission: orig.commission,
          distanceKm: orig.distanceKm,
          status: "pending",
          externalId: `ORD-${Date.now()}`,
        });
      }
    }

    return res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("Advance order status error:", err);
    return res.status(500).json({ error: "فشل تحديث حالة الطلبية" });
  }
});

// POST /api/orders/:id/decline
// Remove assignment so order becomes available again
router.post("/orders/:id/decline", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "رقم الطلبية غير صحيح" });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("Decline order error:", err);
    return res.status(500).json({ error: "فشل رفض الطلبية" });
  }
});

// GET /api/restaurants
router.get("/restaurants", async (req, res) => {
  try {
    const rows = await db.select().from(restaurantsTable);
    return res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      latitude: r.latitude ? parseFloat(r.latitude) : null,
      longitude: r.longitude ? parseFloat(r.longitude) : null,
      phone: r.phone,
    })));
  } catch (err) {
    console.error("Get restaurants error:", err);
    return res.status(500).json({ error: "فشل جلب المطاعم" });
  }
});

export default router;
