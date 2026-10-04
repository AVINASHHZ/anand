import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { INITIAL_CYCLES } from "../../shared/catalogue";
import type { CreateCycleInput, CycleRange, CycleMake } from "../../shared/shop";
import {
  createShopCycle,
  createShopSession,
  deleteShopCycle,
  getActiveShopSession,
  listShopCycles,
  revokeShopSession,
  seedCycleCatalogueOnce,
  upsertGoogleCustomer,
} from "../db";

const SESSION_COOKIE = "anand_shop_session";
const GOOGLE_STATE_COOKIE = "anand_google_state";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const STATE_SECONDS = 60 * 10;
const ALLOWED_RANGES: CycleRange[] = ["Roadeo", "Junior Roadsters", "Senior Roadsters", "Ninety One E-Bikes", "Ninety One EV", "Indian Bicycles", "Indian E-Bikes", "Other"];
const ALLOWED_MAKES: CycleMake[] = ["Hercules", "BSA / Hercules", "Ninety One", "Hero", "Firefox", "Montra", "Tata Stryder", "Cradiac", "Leader", "EMotorad", "Other"];

interface GoogleState {
  state: string;
  nonce: string;
  verifier: string;
  origin: string;
  role: "customer" | "owner";
  issuedAt: number;
}

const attemptWindows = new Map<string, { count: number; start: number }>();

function secret(name: string) {
  return process.env[name]?.trim() || "";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function equalSecret(candidate: string, expected: string) {
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function browserOrigin(req: Request) {
  const raw = req.get("origin");
  if (!raw || raw === "null") return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.origin !== raw || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function secureFromOrigin(origin: string) {
  return new URL(origin).protocol === "https:";
}

function originFromReferer(req: Request) {
  const referrer = req.get("referer");
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch { return null; }
}

function setCookie(res: Response, name: string, value: string, origin: string, maxAge: number, sameSite: "lax" | "none" = "none") {
  const secure = secureFromOrigin(origin);
  res.cookie(name, value, {
    httpOnly: true,
    secure,
    sameSite: secure ? sameSite : "lax",
    path: "/",
    maxAge: maxAge * 1000,
  });
}

function clearCookie(res: Response, name: string, origin: string, sameSite: "lax" | "none" = "none") {
  const secure = secureFromOrigin(origin);
  res.clearCookie(name, { httpOnly: true, secure, sameSite: secure ? sameSite : "lax", path: "/" });
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.cookie;
  if (!raw) return "";
  try { return parseCookie(raw)[name] || ""; } catch { return ""; }
}

function signState(payload: GoogleState, clientSecret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", clientSecret).update(body).digest("hex");
  return `${body}.${signature}`;
}

function readStateCookie(value: string, clientSecret: string): GoogleState | null {
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra) return null;
  const expected = createHmac("sha256", clientSecret).update(body).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "hex"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const state = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GoogleState;
    if (!state.state || !state.nonce || !state.verifier || !state.origin || !state.role || !state.issuedAt) return null;
    if (Date.now() - state.issuedAt > STATE_SECONDS * 1000) return null;
    return state;
  } catch { return null; }
}

function readSessionToken(req: Request) {
  return cookieValue(req, SESSION_COOKIE);
}

async function getSession(req: Request) {
  const token = readSessionToken(req);
  if (!token) return undefined;
  return getActiveShopSession(hash(token));
}

function requireJson(req: Request, res: Response) {
  if (!req.is("application/json")) {
    res.status(415).json({ error: "Use the website form to submit this request." });
    return false;
  }
  return true;
}

function stringField(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function safeImageUrl(value: unknown) {
  if (typeof value === "string" && /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/i.test(value) && value.length <= 8 * 1024 * 1024) return value;
  const image = stringField(value, 2048);
  if (!image) return "";
  if ((image.startsWith("/manus-storage/") || image.startsWith("/catalogue/") || image.startsWith("/logo")) && !image.includes("..")) return image;
  try {
    const url = new URL(image);
    if (url.protocol === "https:" && !url.username && !url.password) return url.toString();
  } catch { /* invalid URL */ }
  return "invalid";
}

function tooManyOwnerAttempts(req: Request) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const attempt = attemptWindows.get(ip);
  if (!attempt || now - attempt.start > 15 * 60 * 1000) {
    attemptWindows.set(ip, { count: 1, start: now });
    return false;
  }
  attempt.count += 1;
  return attempt.count > 10;
}

function clearOwnerAttempts(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  attemptWindows.delete(ip);
}

function createGoogleAuthorizationUrl(origin: string, res: Response, role: "customer" | "owner" = "customer") {
  const clientId = secret("GOOGLE_CLIENT_ID");
  const clientSecret = secret("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${origin}/api/shop/google/callback`;
  const signedState = signState({ state, nonce, verifier, origin, role, issuedAt: Date.now() }, clientSecret);
  setCookie(res, GOOGLE_STATE_COOKIE, signedState, origin, STATE_SECONDS, "none");

  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return authorization.toString();
}

export async function initializeShopCatalogue() {
  try {
    await seedCycleCatalogueOnce();
    console.log("[Shop] Initial cycle catalogue is ready.");
  } catch (error) {
    console.warn("[Shop] Catalogue seeding unavailable:", error instanceof Error ? error.message : "unknown error");
  }
}

export function registerShopRoutes(app: Express) {
  app.use("/api/shop", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/shop/config", (_req, res) => {
    res.json({
      googleLoginReady: Boolean(secret("GOOGLE_CLIENT_ID") && secret("GOOGLE_CLIENT_SECRET")),
      ownerLoginReady: Boolean(secret("ANAND_OWNER_USERNAME") && secret("ANAND_OWNER_PASSKEY")),
      ownerGoogleLoginReady: Boolean(secret("GOOGLE_CLIENT_ID") && secret("GOOGLE_CLIENT_SECRET") && secret("ANAND_OWNER_GOOGLE_EMAIL")),
    });
  });

  app.get("/api/shop/products", async (_req, res) => {
    try {
      res.json(await listShopCycles());
    } catch (error) {
      console.warn("[Shop] Using the supplied brochure catalogue fallback:", error instanceof Error ? error.message : "database unavailable");
      res.json(INITIAL_CYCLES.map((cycle, index) => ({ ...cycle, id: index + 1, ownerAdded: false })));
    }
  });

  app.get("/api/shop/session", async (req, res) => {
    try {
      const session = await getSession(req);
      res.json(session ? { authenticated: true, role: session.role } : { authenticated: false, role: null });
    } catch {
      res.json({ authenticated: false, role: null });
    }
  });

  app.get("/api/shop/google/redirect", (req, res) => {
    const origin = stringField(req.query.origin, 512);
    const referringOrigin = originFromReferer(req);
    if (!origin || !referringOrigin || origin !== referringOrigin) {
      return res.status(403).send("Open Google sign-in from the Anand Cycles customer login page.");
    }
    const authorizationUrl = createGoogleAuthorizationUrl(origin, res, "customer");
    if (!authorizationUrl) return res.redirect("/login?issue=google-config");
    return res.redirect(authorizationUrl);
  });


  app.get("/api/shop/google/owner/redirect", (req, res) => {
    const origin = stringField(req.query.origin, 512);
    const referringOrigin = originFromReferer(req);
    if (!origin || !referringOrigin || origin !== referringOrigin) {
      return res.status(403).send("Open owner Google sign-in from the Anand Cycles owner page.");
    }
    if (!secret("ANAND_OWNER_GOOGLE_EMAIL")) return res.redirect("/owner?issue=google-owner-config");
    const authorizationUrl = createGoogleAuthorizationUrl(origin, res, "owner");
    if (!authorizationUrl) return res.redirect("/owner?issue=google-config");
    return res.redirect(authorizationUrl);
  });

  app.post("/api/shop/owner/login", async (req, res) => {
    if (!requireJson(req, res)) return;
    const origin = browserOrigin(req);
    if (!origin) return res.status(403).json({ error: "Open the owner sign-in from the shop website." });
    const username = stringField(req.body?.username, 128);
    const passkey = stringField(req.body?.passkey, 512);
    const expectedUsername = secret("ANAND_OWNER_USERNAME");
    const expectedPasskey = secret("ANAND_OWNER_PASSKEY");
    if (!expectedUsername || !expectedPasskey) return res.status(503).json({ error: "Owner sign-in is not configured yet." });
    if (tooManyOwnerAttempts(req)) return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes before trying again." });
    if (!username || !passkey || !equalSecret(username, expectedUsername) || !equalSecret(passkey, expectedPasskey)) {
      return res.status(401).json({ error: "That username and passkey did not match." });
    }
    clearOwnerAttempts(req);
    try {
      const token = randomBytes(32).toString("base64url");
      await createShopSession({ tokenHash: hash(token), principalId: "shop-owner", role: "owner", expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
      setCookie(res, SESSION_COOKIE, token, origin, SESSION_SECONDS, "none");
      return res.json({ authenticated: true, role: "owner" });
    } catch {
      return res.status(503).json({ error: "The owner session could not be saved. Please try again." });
    }
  });

  app.post("/api/shop/google/start", (req, res) => {
    if (!requireJson(req, res)) return;
    const origin = browserOrigin(req);
    if (!origin || stringField(req.body?.origin, 512) !== origin) {
      return res.status(403).json({ error: "Open customer sign-in from the shop website." });
    }
    const authorizationUrl = createGoogleAuthorizationUrl(origin, res);
    if (!authorizationUrl) return res.status(503).json({ error: "Google customer sign-in is not configured yet." });
    return res.json({ authorizationUrl });
  });

  app.get("/api/shop/google/callback", async (req, res) => {
    const clientSecret = secret("GOOGLE_CLIENT_SECRET");
    const stateCookie = cookieValue(req, GOOGLE_STATE_COOKIE);
    const state = readStateCookie(stateCookie, clientSecret);
    if (state) clearCookie(res, GOOGLE_STATE_COOKIE, state.origin, "lax");
    const returnedState = stringField(req.query.state, 512);
    const code = stringField(req.query.code, 4096);
    if (!state || !returnedState || returnedState !== state.state || !code) {
      return res.redirect("/login?issue=google-state");
    }

    try {
      const clientId = secret("GOOGLE_CLIENT_ID");
      if (!clientId || !clientSecret) return res.redirect("/login?issue=google-config");
      const redirectUri = `${state.origin}/api/shop/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code_verifier: state.verifier,
        }),
      });
      if (!tokenResponse.ok) return res.redirect("/login?issue=google-exchange");
      const tokens = await tokenResponse.json() as { id_token?: string };
      if (!tokens.id_token) return res.redirect("/login?issue=google-identity");
      const identityResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
      if (!identityResponse.ok) return res.redirect("/login?issue=google-identity");
      const identity = await identityResponse.json() as Record<string, unknown>;
      const issuer = identity.iss;
      const verified = identity.email_verified === true || identity.email_verified === "true";
      if (identity.aud !== clientId || (issuer !== "accounts.google.com" && issuer !== "https://accounts.google.com") || !verified || typeof identity.sub !== "string" || typeof identity.email !== "string") {
        return res.redirect("/login?issue=google-identity");
      }
      if (identity.nonce !== state.nonce) return res.redirect("/login?issue=google-nonce");

      const name = typeof identity.name === "string" ? identity.name.slice(0, 191) : null;
      const email = identity.email.slice(0, 320).toLowerCase();
      if (state.role === "owner") {
        const ownerEmail = secret("ANAND_OWNER_GOOGLE_EMAIL").toLowerCase();
        if (!ownerEmail || email !== ownerEmail) return res.redirect("/owner?issue=google-owner-denied");
        const token = randomBytes(32).toString("base64url");
        await createShopSession({ tokenHash: hash(token), principalId: identity.sub, role: "owner", expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
        setCookie(res, SESSION_COOKIE, token, state.origin, SESSION_SECONDS, "none");
        return res.redirect("/owner");
      }
      await upsertGoogleCustomer({ googleSub: identity.sub, email, name });
      const token = randomBytes(32).toString("base64url");
      await createShopSession({ tokenHash: hash(token), principalId: identity.sub, role: "customer", expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
      setCookie(res, SESSION_COOKIE, token, state.origin, SESSION_SECONDS, "none");
      return res.redirect("/");
    } catch (error) {
      console.error("[Shop] Google sign-in failed:", error instanceof Error ? error.message : "unknown error");
      return res.redirect("/login?issue=google-unavailable");
    }
  });

  app.post("/api/shop/logout", async (req, res) => {
    if (!requireJson(req, res)) return;
    const origin = browserOrigin(req);
    if (!origin) return res.status(403).json({ error: "Open the shop website before signing out." });
    const token = readSessionToken(req);
    if (token) await revokeShopSession(hash(token)).catch(() => undefined);
    clearCookie(res, SESSION_COOKIE, origin, "none");
    return res.json({ success: true });
  });

  app.post("/api/shop/products", async (req, res) => {
    if (!requireJson(req, res)) return;
    const origin = browserOrigin(req);
    if (!origin) return res.status(403).json({ error: "Open the owner panel from the shop website." });
    try {
      const session = await getSession(req);
      if (session?.role !== "owner") return res.status(401).json({ error: "Owner sign-in is required." });
      const model = stringField(req.body?.model, 160);
      const make = stringField(req.body?.make, 64) as CycleMake;
      const range = stringField(req.body?.range, 48) as CycleRange;
      const wheelSize = stringField(req.body?.wheelSize, 96);
      const detail = stringField(req.body?.detail, 1200);
      const imageUrl = safeImageUrl(req.body?.imageUrl);
      if (!model) return res.status(400).json({ error: "Add a cycle model name." });
      if (!ALLOWED_MAKES.includes(make)) return res.status(400).json({ error: "Choose a listed make." });
      if (!ALLOWED_RANGES.includes(range)) return res.status(400).json({ error: "Choose a listed cycle range." });
      if (!imageUrl || imageUrl === "invalid") return res.status(400).json({ error: "A valid PNG or JPEG photo is required. Upload a file or use an HTTPS image URL." });
      const slug = `owner-${createHash("sha256").update(`${Date.now()}-${randomBytes(8).toString("hex")}-${model}`).digest("hex").slice(0, 24)}`;
      const input: CreateCycleInput & { slug: string } = { model, make, range, wheelSize, detail, imageUrl, slug };
      const created = await createShopCycle(input);
      return res.status(201).json(created);
    } catch {
      return res.status(503).json({ error: "The cycle could not be saved. Check that the catalogue database is available." });
    }
  });

  app.delete("/api/shop/products/:id", async (req, res) => {
    const origin = browserOrigin(req);
    if (!origin) return res.status(403).json({ error: "Open the owner panel from the shop website." });
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "That cycle listing was not found." });
    try {
      const session = await getSession(req);
      if (session?.role !== "owner") return res.status(401).json({ error: "Owner sign-in is required." });
      const removed = await deleteShopCycle(id);
      return removed ? res.json({ success: true }) : res.status(404).json({ error: "That cycle listing was not found." });
    } catch {
      return res.status(503).json({ error: "The cycle could not be deleted. Please try again." });
    }
  });
}
