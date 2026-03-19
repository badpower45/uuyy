import { db } from "@workspace/db";
import {
  driversTable,
  restaurantsTable,
  ordersTable,
  earningsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Insert driver
  const [driver] = await db
    .insert(driversTable)
    .values({
      name: "محمد أحمد",
      phone: "01012345678",
      passwordHash: "hashed_1234",
      avatarLetter: "م",
      rank: "gold",
      balance: "-85.50",
      creditLimit: "500.00",
      totalTrips: 247,
      rating: "4.8",
      isOnline: false,
    })
    .onConflictDoNothing()
    .returning();

  let driverId: number;
  if (!driver) {
    console.log("Driver already exists, fetching...");
    const [existing] = await db
      .select()
      .from(driversTable)
      .where(eq(driversTable.phone, "01012345678"))
      .limit(1);
    if (!existing) {
      console.error("No driver found");
      process.exit(1);
    }
    driverId = existing.id;
  } else {
    driverId = driver.id;
  }

  console.log(`✅ السواق جاهز (id=${driverId})`);

  // ─── Restaurants (5 Cairo restaurants with real coordinates) ──────────────
  const restaurants = [
    { name: "مطعم الأصالة", address: "شارع التحرير، الدقي، الجيزة", latitude: "30.0626", longitude: "31.1992", phone: "0221234567" },
    { name: "كنتاكي مدينة نصر", address: "شارع عباس العقاد، مدينة نصر، القاهرة", latitude: "30.0754", longitude: "31.3366", phone: "0225551234" },
    { name: "بيتزا هت المهندسين", address: "شارع جامعة الدول العربية، المهندسين، الجيزة", latitude: "30.0561", longitude: "31.2021", phone: "0233214321" },
    { name: "ماكدونالدز الزمالك", address: "شارع 26 يوليو، الزمالك، القاهرة", latitude: "30.0641", longitude: "31.2204", phone: "0227362211" },
    { name: "مطعم الشاورما الأصلي", address: "شارع رمسيس، وسط البلد، القاهرة", latitude: "30.0600", longitude: "31.2490", phone: "0223456789" },
  ];

  const restaurantIds: number[] = [];
  for (const r of restaurants) {
    const [inserted] = await db.insert(restaurantsTable).values(r).onConflictDoNothing().returning();
    if (inserted) {
      restaurantIds.push(inserted.id);
      console.log(`  🍽️  ${inserted.name} (id=${inserted.id})`);
    } else {
      const [existing] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.name, r.name)).limit(1);
      if (existing) restaurantIds.push(existing.id);
    }
  }
  console.log(`✅ ${restaurantIds.length} مطعم جاهز\n`);

  // ─── Pending orders ────────────────────────────────────────────────────────
  await db.execute(sql`DELETE FROM orders WHERE status = 'pending' AND driver_id IS NULL`);

  const pendingOrders = [
    { externalId: `ORD-${Date.now()}-1`, restaurantId: restaurantIds[0], customerName: "أحمد السيد", customerPhone: "01112345678", customerAddress: "شارع مكرم عبيد، مدينة نصر", customerLatitude: "30.0720", customerLongitude: "31.3450", fare: "55.00", cashToCollect: "55.00", commission: "13.75", distanceKm: "8.3" },
    { externalId: `ORD-${Date.now()}-2`, restaurantId: restaurantIds[1], customerName: "فاطمة محمود", customerPhone: "01098765432", customerAddress: "شارع الهرم، الجيزة", customerLatitude: "29.9870", customerLongitude: "31.1920", fare: "70.00", cashToCollect: "70.00", commission: "17.50", distanceKm: "12.1" },
    { externalId: `ORD-${Date.now()}-3`, restaurantId: restaurantIds[2], customerName: "كريم عبدالله", customerPhone: "01234567890", customerAddress: "شارع صلاح سالم، العباسية", customerLatitude: "30.0710", customerLongitude: "31.2890", fare: "45.00", cashToCollect: "45.00", commission: "11.25", distanceKm: "5.7" },
    { externalId: `ORD-${Date.now()}-4`, restaurantId: restaurantIds[3], customerName: "نور حسين", customerPhone: "01511223344", customerAddress: "التجمع الخامس، القاهرة الجديدة", customerLatitude: "30.0137", customerLongitude: "31.4800", fare: "90.00", cashToCollect: "90.00", commission: "22.50", distanceKm: "18.5" },
    { externalId: `ORD-${Date.now()}-5`, restaurantId: restaurantIds[4], customerName: "منى إبراهيم", customerPhone: "01699887766", customerAddress: "شارع فيصل، إمبابة، الجيزة", customerLatitude: "30.0815", customerLongitude: "31.2070", fare: "38.00", cashToCollect: "38.00", commission: "9.50", distanceKm: "4.2" },
  ];

  for (const o of pendingOrders) {
    const [ins] = await db.insert(ordersTable).values({ ...o, status: "pending" }).returning();
    console.log(`  📦 ${ins.customerName} ← ${o.customerAddress} | ${o.fare} ج`);
  }
  console.log(`✅ ${pendingOrders.length} طلبيات معلقة جاهزة\n`);

  // ─── Weekly earnings ───────────────────────────────────────────────────────
  const today = new Date();
  const ARABIC_DAYS: Record<string, string> = { "0": "الأحد", "1": "الاثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس", "5": "الجمعة", "6": "السبت" };
  const days = [
    { offset: 6, trips: 8,  farePerTrip: 42 },
    { offset: 5, trips: 12, farePerTrip: 45 },
    { offset: 4, trips: 6,  farePerTrip: 38 },
    { offset: 3, trips: 15, farePerTrip: 50 },
    { offset: 2, trips: 10, farePerTrip: 44 },
    { offset: 1, trips: 9,  farePerTrip: 47 },
    { offset: 0, trips: 11, farePerTrip: 43 },
  ];

  for (const day of days) {
    const earningDate = new Date(today);
    earningDate.setDate(today.getDate() - day.offset);
    const dateStr = earningDate.toISOString().split("T")[0];
    const total = day.farePerTrip * day.trips;
    await db.insert(earningsTable).values({
      driverId,
      orderId: null,
      earningDate: dateStr,
      tripsCount: day.trips,
      amount: total.toFixed(2),
      cashCollected: ((day.farePerTrip + 15) * day.trips).toFixed(2),
      commission: (total * 0.25).toFixed(2),
    }).onConflictDoNothing();
    console.log(`  📅 ${ARABIC_DAYS[String(earningDate.getDay())]}: ${day.trips} رحلة — ${total} ج`);
  }

  console.log("\n✅ تهيئة البيانات اكتملت بنجاح!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
