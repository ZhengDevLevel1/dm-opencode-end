import { boolean, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  role: varchar("role", { length: 16 }).notNull().default("customer"),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
  consumed: boolean("consumed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});
