import { pgTable, serial, integer, decimal, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";
import { ordersTable } from "./orders";

export const earningsTable = pgTable("earnings", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  earningDate: date("earning_date").notNull(),
  tripsCount: integer("trips_count").notNull().default(1),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  cashCollected: decimal("cash_collected", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEarningSchema = createInsertSchema(earningsTable).omit({ id: true, createdAt: true });
export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Earning = typeof earningsTable.$inferSelect;
