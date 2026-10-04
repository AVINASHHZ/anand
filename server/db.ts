import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { INITIAL_CYCLES } from "../shared/catalogue";
import type { CreateCycleInput, CycleRecord } from "../shared/shop";
import { InsertUser, shopCustomers, shopCycles, shopSessions, shopSettings, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const memoryCycles: CycleRecord[] = INITIAL_CYCLES.map((cycle, index) => ({ ...cycle, id: index + 1, ownerAdded: false }));
const memorySessions = new Map<string, { tokenHash: string; principalId: string; role: "customer" | "owner"; expiresAt: Date }>();
let nextMemoryCycleId = memoryCycles.length + 1;

function databaseWarning(operation: string, error: unknown) {
  console.warn(`[Database] ${operation} unavailable; using the in-memory preview fallback.`, error instanceof Error ? error.message : "unknown error");
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error instanceof Error ? error.message : "unknown error");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function seedCycleCatalogueOnce() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [marker] = await db.select({ key: shopSettings.key }).from(shopSettings).where(eq(shopSettings.key, "catalog_seed_v1")).limit(1);
  if (!marker) {
    const rows = INITIAL_CYCLES.map((cycle) => ({ ...cycle, ownerAdded: false }));
    await db.insert(shopCycles).values(rows).onDuplicateKeyUpdate({ set: { slug: sql`${shopCycles.slug}` } });
    await db.insert(shopSettings).values({ key: "catalog_seed_v1", value: "brochure-2026-10" }).onDuplicateKeyUpdate({ set: { value: "brochure-2026-10" } });
  }

  const latestKey = "catalog_latest_india_2026_10";
  const [latestMarker] = await db.select({ key: shopSettings.key }).from(shopSettings).where(eq(shopSettings.key, latestKey)).limit(1);
  if (!latestMarker) {
    const latestSlugs = new Set(["roadeo-gider-ss", "roadeo-draugr-21sp", "roadeo-draugr-ss", "roadeo-ryken-ss", "roadeo-ryken-21sp", "hardstyle", "hardstyle-pro", "yuvolt"]);
    const additions = INITIAL_CYCLES.filter((cycle) => latestSlugs.has(cycle.slug)).map((cycle) => ({ ...cycle, ownerAdded: false }));
    if (additions.length) await db.insert(shopCycles).values(additions).onDuplicateKeyUpdate({ set: { slug: sql`${shopCycles.slug}` } });
    await db.insert(shopSettings).values({ key: latestKey, value: "official-hercules-india-2026-10" }).onDuplicateKeyUpdate({ set: { value: "official-hercules-india-2026-10" } });
  }

  const expansionKey = "catalog_senior_roadsters_v2";
  const [expansionMarker] = await db.select({ key: shopSettings.key }).from(shopSettings).where(eq(shopSettings.key, expansionKey)).limit(1);
  if (!expansionMarker) {
    const additions = INITIAL_CYCLES.filter((cycle) => cycle.slug === "sr-popular-dlx" || cycle.slug === "sr-popular-singham-dtt").map((cycle) => ({ ...cycle, ownerAdded: false }));
    if (additions.length) await db.insert(shopCycles).values(additions).onDuplicateKeyUpdate({ set: { slug: sql`${shopCycles.slug}` } });
    await db.insert(shopSettings).values({ key: expansionKey, value: "brochure-pages-63-64" }).onDuplicateKeyUpdate({ set: { value: "brochure-pages-63-64" } });
  }
}

export async function listShopCycles() {
  const db = await getDb();
  if (!db) return memoryCycles;
  try {
    const rows = await db.select().from(shopCycles).orderBy(desc(shopCycles.isFeatured), asc(shopCycles.range), asc(shopCycles.model));
    const knownSlugs = new Set(rows.map((row) => row.slug));
    const fallbackAdditions = memoryCycles.filter((cycle) => cycle.ownerAdded && !knownSlugs.has(cycle.slug));
    return [...rows, ...fallbackAdditions];
  } catch (error) {
    databaseWarning("Cycle listing", error);
    return memoryCycles;
  }
}

export async function createShopCycle(input: CreateCycleInput & { slug: string }) {
  const db = await getDb();
  const memoryRecord: CycleRecord = { id: nextMemoryCycleId++, slug: input.slug, model: input.model, make: input.make, range: input.range, wheelSize: input.wheelSize || null, detail: input.detail || null, imageUrl: input.imageUrl || null, sourcePage: null, isFeatured: false, ownerAdded: true };
  memoryCycles.push(memoryRecord);
  if (!db) {
    return memoryRecord;
  }
  try {
    await db.insert(shopCycles).values({ ...memoryRecord });
    const [created] = await db.select().from(shopCycles).where(eq(shopCycles.slug, input.slug)).limit(1);
    if (!created) throw new Error("Created cycle could not be read back");
    return created;
  } catch (error) {
    databaseWarning("Cycle creation", error);
    return memoryRecord;
  }
}

export async function deleteShopCycle(id: number) {
  const db = await getDb();
  const memoryIndex = memoryCycles.findIndex((cycle) => cycle.id === id);
  const memoryWasRemoved = memoryIndex >= 0 ? Boolean(memoryCycles.splice(memoryIndex, 1).length) : false;
  if (!db) {
    return memoryWasRemoved;
  }
  try {
    const [existing] = await db.select().from(shopCycles).where(eq(shopCycles.id, id)).limit(1);
    if (!existing) return false;
    await db.delete(shopCycles).where(eq(shopCycles.id, id));
    if (existing.isFeatured) {
      const [replacement] = await db.select().from(shopCycles).orderBy(asc(shopCycles.createdAt), asc(shopCycles.id)).limit(1);
      if (replacement) await db.update(shopCycles).set({ isFeatured: true }).where(eq(shopCycles.id, replacement.id));
    }
    return true;
  } catch (error) {
    databaseWarning("Cycle deletion", error);
    return memoryWasRemoved;
  }
}

export async function upsertGoogleCustomer(input: { googleSub: string; email: string; name: string | null }) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  try {
    await db.insert(shopCustomers).values({ ...input, lastSignedIn: now }).onDuplicateKeyUpdate({
      set: { email: input.email, name: input.name, lastSignedIn: now },
    });
  } catch (error) {
    databaseWarning("Customer profile persistence", error);
  }
}

export async function createShopSession(input: { tokenHash: string; principalId: string; role: "customer" | "owner"; expiresAt: Date }) {
  const db = await getDb();
  if (!db) {
    memorySessions.set(input.tokenHash, input);
    return;
  }
  try {
    await db.insert(shopSessions).values(input);
  } catch (error) {
    databaseWarning("Session persistence", error);
    memorySessions.set(input.tokenHash, input);
  }
}

export async function getActiveShopSession(tokenHash: string) {
  const db = await getDb();
  if (!db) {
    const session = memorySessions.get(tokenHash);
    if (!session || session.expiresAt <= new Date()) { memorySessions.delete(tokenHash); return undefined; }
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return session;
  }
  try {
    const [session] = await db.select().from(shopSessions).where(and(
      eq(shopSessions.tokenHash, tokenHash),
      gt(shopSessions.expiresAt, new Date()),
    )).limit(1);
    if (session) await db.update(shopSessions).set({ expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }).where(eq(shopSessions.tokenHash, tokenHash));
    return session;
  } catch (error) {
    databaseWarning("Session lookup", error);
    const session = memorySessions.get(tokenHash);
    if (!session || session.expiresAt <= new Date()) { memorySessions.delete(tokenHash); return undefined; }
    session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return session;
  }
}

export async function revokeShopSession(tokenHash: string) {
  const db = await getDb();
  if (!db) { memorySessions.delete(tokenHash); return; }
  try {
    await db.delete(shopSessions).where(eq(shopSessions.tokenHash, tokenHash));
  } catch (error) {
    databaseWarning("Session revocation", error);
    memorySessions.delete(tokenHash);
  }
}
