import { pgTable, serial, varchar, text, decimal, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";
import { restaurantsTable } from "./restaurants";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "assigned",
  "to_restaurant",
  "picked_up",
  "to_customer",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 50 }).unique(),
  driverId: integer("driver_id").references(() => driversTable.id),
  restaurantId: integer("restaurant_id").references(() => restaurantsTable.id),
  status: orderStatusEnum("status").notNull().default("pending"),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  customerAddress: text("customer_address").notNull(),
  customerLatitude: decimal("customer_latitude", { precision: 10, scale: 7 }),
  customerLongitude: decimal("customer_longitude", { precision: 10, scale: 7 }),
  fare: decimal("fare", { precision: 10, scale: 2 }).notNull().default("0.00"),
  cashToCollect: decimal("cash_to_collect", { precision: 10, scale: 2 }).notNull().default("0.00"),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull().default("0.00"),
  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
