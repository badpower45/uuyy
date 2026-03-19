import { pgTable, serial, varchar, char, pgEnum, boolean, decimal, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const driverRankEnum = pgEnum("driver_rank", ["bronze", "silver", "gold", "platinum"]);
export const driverStatusEnum = pgEnum("driver_status", ["active", "suspended", "inactive"]);

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  avatarLetter: char("avatar_letter", { length: 1 }).notNull().default("م"),
  rank: driverRankEnum("rank").notNull().default("bronze"),
  status: driverStatusEnum("status").notNull().default("active"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).notNull().default("500.00"),
  totalTrips: integer("total_trips").notNull().default(0),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull().default("5.0"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
