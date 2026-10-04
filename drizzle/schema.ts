import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const shopCycles = mysqlTable("shop_cycles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  model: varchar("model", { length: 160 }).notNull(),
  make: varchar("make", { length: 64 }).notNull(),
  range: varchar("range", { length: 48 }).notNull(),
  wheelSize: varchar("wheelSize", { length: 96 }),
  detail: text("detail"),
  imageUrl: varchar("imageUrl", { length: 2048 }),
  sourcePage: varchar("sourcePage", { length: 255 }),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  ownerAdded: boolean("ownerAdded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shopCustomers = mysqlTable("shop_customers", {
  id: int("id").autoincrement().primaryKey(),
  googleSub: varchar("googleSub", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 191 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const shopSessions = mysqlTable("shop_sessions", {
  tokenHash: varchar("tokenHash", { length: 64 }).primaryKey(),
  principalId: varchar("principalId", { length: 128 }).notNull(),
  role: mysqlEnum("role", ["customer", "owner"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const shopSettings = mysqlTable("shop_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ShopCycle = typeof shopCycles.$inferSelect;
export type NewShopCycle = typeof shopCycles.$inferInsert;
export type ShopCustomer = typeof shopCustomers.$inferSelect;
export type ShopSession = typeof shopSessions.$inferSelect;
