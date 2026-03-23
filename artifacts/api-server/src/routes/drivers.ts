import { Router } from "express";
import { db, driversTable, earningsTable, ordersTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";

const router = Router();

// GET /api/drivers/:phone — get driver by phone
router.get("/drivers/by-phone/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const [driver] = await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.phone, phone))
      .limit(1);

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    return res.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      avatarLetter: driver.avatarLetter,
      rank: driver.rank,
      balance: parseFloat(driver.balance),
      creditLimit: parseFloat(driver.creditLimit),
      totalTrips: driver.totalTrips,
      rating: parseFloat(driver.rating),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/drivers/:id/earnings/weekly — get last 7 days earnings
router.get("/drivers/:id/earnings/weekly", async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: "Invalid driver id" });
    }

    // Get last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromDate = sevenDaysAgo.toISOString().split("T")[0];

    const rows = await db
      .select({
        earningDate: earningsTable.earningDate,
        totalAmount: sql<string>`SUM(${earningsTable.amount})`,
        totalCash: sql<string>`SUM(${earningsTable.cashCollected})`,
        totalCommission: sql<string>`SUM(${earningsTable.commission})`,
        tripCount: sql<string>`SUM(${earningsTable.tripsCount})`,
      })
      .from(earningsTable)
      .where(
        sql`${earningsTable.driverId} = ${driverId} AND ${earningsTable.earningDate} >= ${fromDate}`
      )
      .groupBy(earningsTable.earningDate)
      .orderBy(earningsTable.earningDate);

    const ARABIC_DAYS: Record<string, string> = {
      "0": "الأحد",
      "1": "الاثنين",
      "2": "الثلاثاء",
      "3": "الأربعاء",
      "4": "الخميس",
      "5": "الجمعة",
      "6": "السبت",
    };

    const result = rows.map((row) => {
      const dateObj = new Date(row.earningDate + "T00:00:00");
      const dayName = ARABIC_DAYS[String(dateObj.getDay())];
      return {
        date: dayName,
        isoDate: row.earningDate,
        trips: parseInt(row.tripCount),
        earnings: parseFloat(row.totalAmount),
        cashCollected: parseFloat(row.totalCash),
        commission: parseFloat(row.totalCommission),
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/drivers/:id/earnings — record a new earning entry
router.post("/drivers/:id/earnings", async (req, res) => {
  try {
    const driverId = parseInt(req.params.id);
    if (isNaN(driverId)) {
      return res.status(400).json({ error: "Invalid driver id" });
    }
    const { amount, cashCollected, commission, orderId, earningDate, tripsCount } = req.body;
    const today = new Date().toISOString().split("T")[0];

    let amountValue = Number(amount ?? 0);
    let cashCollectedValue = Number(cashCollected ?? 0);
    let commissionValue = Number(commission ?? 0);
    const normalizedTripsCount = Number.isFinite(Number(tripsCount))
      ? Math.max(1, Math.floor(Number(tripsCount)))
      : 1;
    const normalizedEarningDate =
      typeof earningDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(earningDate)
        ? earningDate
        : today;

    // If linked to an order, use DB financial values as the source of truth.
    if (orderId != null) {
      const parsedOrderId = Number(orderId);
      if (!Number.isNaN(parsedOrderId)) {
        const [order] = await db
          .select({
            fare: ordersTable.fare,
            cashToCollect: ordersTable.cashToCollect,
            commission: ordersTable.commission,
          })
          .from(ordersTable)
          .where(eq(ordersTable.id, parsedOrderId))
          .limit(1);

        if (order) {
          amountValue = parseFloat(order.fare);
          cashCollectedValue = parseFloat(order.cashToCollect);
          commissionValue = parseFloat(order.commission);
        }
      }
    }

    const [row] = await db
      .insert(earningsTable)
      .values({
        driverId,
        orderId: orderId ?? null,
        earningDate: normalizedEarningDate,
        tripsCount: normalizedTripsCount,
        amount: String(amountValue),
        cashCollected: String(cashCollectedValue),
        commission: String(commissionValue),
      })
      .returning();

    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/drivers/seed/test-drivers — Seed test drivers (for development)
router.post("/seed/test-drivers", async (req, res) => {
  try {
    const testDrivers = [
      { name: "محمد أحمد", phone: "01012345678", rank: "gold", trips: 47 },
      { name: "علي محمود", phone: "01098765432", rank: "silver", trips: 32 },
      { name: "كريم السيد", phone: "01187654321", rank: "bronze", trips: 28 },
      { name: "حسين فاروق", phone: "01156789012", rank: "silver", trips: 55 },
      { name: "إبراهيم محمد", phone: "01145678901", rank: "bronze", trips: 19 },
      { name: "عمرو خالد", phone: "01134567890", rank: "gold", trips: 78 },
    ];

    const inserted: typeof driversTable.$inferSelect[] = [];
    for (const driver of testDrivers) {
      const [row] = await db
        .insert(driversTable)
        .values({
          name: driver.name,
          phone: driver.phone,
          passwordHash: "hashed_1234",
          avatarLetter: driver.name.charAt(0),
          rank: driver.rank as "gold" | "silver" | "bronze",
          balance: "0.00",
          creditLimit: "500.00",
          totalTrips: driver.trips,
          rating: (Math.random() * 1.5 + 4).toFixed(1),
          isOnline: true,
        })
        .onConflictDoUpdate({
          target: driversTable.phone,
          set: { isOnline: true, totalTrips: driver.trips },
        })
        .returning();

      inserted.push(row);
    }

    return res.status(201).json({
      success: true,
      message: `تم إضافة ${inserted.length} طيار اختبار`,
      drivers: inserted.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        rank: d.rank,
        isOnline: d.isOnline,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
