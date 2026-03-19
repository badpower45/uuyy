import { db } from "@workspace/db";
import {
  driversTable,
  restaurantsTable,
  ordersTable,
  earningsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

  console.log(`✅ Driver ready (id=${driverId})`);

  // Insert restaurant
  const [restaurant] = await db
    .insert(restaurantsTable)
    .values({
      name: "مطعم الأصالة",
      address: "شارع التحرير، الدقي، الجيزة",
      latitude: "30.0626",
      longitude: "31.1992",
      phone: "0221234567",
    })
    .returning();

  console.log(`✅ Restaurant created: ${restaurant.name}`);

  // Insert 7 completed orders (one per day this week)
  const today = new Date();
  const days = [
    { label: "السبت", offset: 6, trips: 8 },
    { label: "الأحد", offset: 5, trips: 12 },
    { label: "الاثنين", offset: 4, trips: 6 },
    { label: "الثلاثاء", offset: 3, trips: 15 },
    { label: "الأربعاء", offset: 2, trips: 10 },
    { label: "الخميس", offset: 1, trips: 9 },
    { label: "الجمعة", offset: 0, trips: 11 },
  ];

  for (const day of days) {
    const earningDate = new Date(today);
    earningDate.setDate(today.getDate() - day.offset);
    const dateStr = earningDate.toISOString().split("T")[0];

    const farePerTrip = 40;
    const cashPerTrip = farePerTrip + 15;
    const commissionPerTrip = farePerTrip * 0.25;

    const totalAmount = farePerTrip * day.trips;
    const totalCash = cashPerTrip * day.trips;
    const totalCommission = commissionPerTrip * day.trips;

    // Insert summary earning row per day
    await db.insert(earningsTable).values({
      driverId: driverId,
      orderId: null,
      earningDate: dateStr,
      tripsCount: day.trips,
      amount: totalAmount.toFixed(2),
      cashCollected: totalCash.toFixed(2),
      commission: totalCommission.toFixed(2),
    });

    console.log(`  📅 ${day.label} (${dateStr}): ${day.trips} رحلة — ${totalAmount} ج`);
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
