import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "bloom_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Password hashing (scrypt)                                          */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const actual = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
}

/* ------------------------------------------------------------------ */
/*  Seed demo accounts                                                 */
/* ------------------------------------------------------------------ */

const DEMO_USERS = [
  { username: "customer", password: "customer123", name: "林间客", role: "customer" },
  { username: "staff", password: "staff123", name: "花艺师·青梧", role: "staff" },
  { username: "admin", password: "admin123", name: "店长·屿", role: "admin" },
] as const;

let seedPromise: Promise<void> | null = null;

export function ensureSeedUsers(): Promise<void> {
  seedPromise ??= (async () => {
    for (const demo of DEMO_USERS) {
      await db
        .insert(users)
        .values({
          username: demo.username,
          name: demo.name,
          role: demo.role,
          passwordHash: hashPassword(demo.password),
        })
        .onConflictDoNothing({ target: users.username });
    }
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: string;
};

export async function createSession(userId: string): Promise<void> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.delete(sessions).where(eq(sessions.id, id)).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id || !UUID_RE.test(id)) return null;
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, username: row.username, name: row.name, role: row.role };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export async function findUserByUsername(username: string) {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUserForEmail(email: string) {
  const local = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24) || "guest";
  let username = local;
  for (let i = 0; i < 20; i += 1) {
    const existing = await findUserByUsername(username);
    if (!existing) break;
    username = `${local}_${randomBytes(2).toString("hex")}`;
  }
  const inserted = await db
    .insert(users)
    .values({
      username,
      name: local,
      role: "customer",
      email,
      passwordHash: hashPassword(randomUUID()),
    })
    .returning();
  return inserted[0];
}

export { users, sessions };
export { isNull };
