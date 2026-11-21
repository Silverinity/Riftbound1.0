import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pg from "pg";
const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_GUILD_ID,
  DISCORD_BETA_ROLE_ID,
  FRONTEND_ORIGIN,
  SESSION_SECRET,
  DATABASE_URL
} = process.env;

const required = {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_GUILD_ID,
  DISCORD_BETA_ROLE_ID,
  FRONTEND_ORIGIN,
  SESSION_SECRET,
  DATABASE_URL
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must be at least 32 characters long.");
  process.exit(1);
}

const SESSION_COOKIE = "riftbound_session";
const STATE_COOKIE = "riftbound_oauth_state";
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const encryptionKey = crypto.createHash("sha256").update(SESSION_SECRET).digest();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json({ limit: "128kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});
app.use("/auth", authLimiter);

function cookieOptions(maxAge, sameSite = "none") {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? sameSite : "lax",
    path: "/",
    maxAge
  };
}

function encryptSession(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptSession(value) {
  try {
    const data = Buffer.from(value, "base64url");
    if (data.length < 29) return null;

    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString("utf8");

    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

function setSessionCookie(res, payload, maxAge) {
  res.cookie(SESSION_COOKIE, encryptSession(payload), cookieOptions(maxAge));
}

function clearAuthCookies(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(0));
  res.clearCookie(STATE_COOKIE, cookieOptions(0, "lax"));
}

function frontendRedirect(res, status) {
  const frontendPath = IS_PRODUCTION ? "/Riftbound1.0/" : "/";
  return res.redirect(`${FRONTEND_ORIGIN}${frontendPath}?discord=${encodeURIComponent(status)}`);
}

async function discordRequest(path, accessToken) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const error = new Error(`Discord API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function verifyBetaRole(accessToken) {
  const member = await discordRequest(
    `/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
    accessToken
  );

  return Array.isArray(member.roles) && member.roles.includes(DISCORD_BETA_ROLE_ID);
}

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const entry = header.split(";").map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));
  if (!entry) return null;

  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "riftbound-auth" });
});

app.get("/auth/discord", (_req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  res.cookie(STATE_COOKIE, state, cookieOptions(10 * 60 * 1000, "lax"));

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: DISCORD_REDIRECT_URI,
    scope: "identify guilds.members.read",
    state
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/discord/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const savedState = getCookie(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, cookieOptions(0, "lax"));

  if (error) return frontendRedirect(res, "cancelled");

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    typeof savedState !== "string" ||
    state.length !== savedState.length ||
    !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState))
  ) {
    clearAuthCookies(res);
    return frontendRedirect(res, "login-error");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!tokenResponse.ok) {
      throw new Error("Discord token exchange failed.");
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token || !Number.isFinite(tokenData.expires_in)) {
      throw new Error("Discord returned an invalid token response.");
    }

    const hasBetaRole = await verifyBetaRole(tokenData.access_token);
    if (!hasBetaRole) {
      clearAuthCookies(res);
      return frontendRedirect(res, "denied");
    }

    const user = await discordRequest("/users/@me", tokenData.access_token);
    const remainingTokenMs = Math.max(0, tokenData.expires_in * 1000);
    const cookieMaxAge = Math.min(SESSION_MAX_AGE_MS, remainingTokenMs);

    if (cookieMaxAge <= 0) {
      throw new Error("Discord access token is already expired.");
    }

    setSessionCookie(res, {
      accessToken: tokenData.access_token,
      userId: user.id,
      expiresAt: Date.now() + remainingTokenMs
    }, cookieMaxAge);

    return frontendRedirect(res, "success");
  } catch (error) {
    console.error("Discord login failed:", error.message);
    clearAuthCookies(res);
    return frontendRedirect(res, "login-error");
  }
});

app.get("/api/session", async (req, res) => {
  const rawSession = getCookie(req, SESSION_COOKIE);
  const session = rawSession ? decryptSession(rawSession) : null;

  if (!session?.accessToken || !session?.userId || Date.now() >= session.expiresAt) {
    clearAuthCookies(res);
    return res.status(401).json({ authenticated: false, reason: "not-authenticated" });
  }

  try {
    // Check the role on every session request so removing the role revokes access.
    const hasBetaRole = await verifyBetaRole(session.accessToken);
    if (!hasBetaRole) {
      clearAuthCookies(res);
      return res.status(403).json({ authenticated: false, reason: "beta-access-required" });
    }

    const user = await discordRequest("/users/@me", session.accessToken);
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.global_name || user.username
      }
    });
  } catch (error) {
    clearAuthCookies(res);
    const status = error.status === 401 || error.status === 404 ? 401 : 503;
    return res.status(status).json({
      authenticated: false,
      reason: status === 401 ? "discord-session-expired" : "verification-unavailable"
    });
  }
});

app.post("/auth/logout", (_req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});


const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: IS_PRODUCTION ? { rejectUnauthorized: false } : undefined,
  max: 5,
  connectionTimeoutMillis: 10000
});

async function verifiedSaveUser(req) {
  const raw = getCookie(req, SESSION_COOKIE);
  const session = raw ? decryptSession(raw) : null;
  if (!session?.accessToken || !session?.userId || Date.now() >= session.expiresAt) {
    return { ok: false, status: 401, error: "not-authenticated" };
  }
  try {
    if (!(await verifyBetaRole(session.accessToken))) {
      return { ok: false, status: 403, error: "beta-access-required" };
    }
    return { ok: true, userId: session.userId };
  } catch (error) {
    const status = error.status === 401 || error.status === 404 ? 401 : 503;
    return { ok: false, status, error: status === 401 ? "discord-session-expired" : "verification-unavailable" };
  }
}

function cleanSave(body) {
  if (!body || typeof body !== "object" || !body.save || typeof body.save !== "object") return null;
  const save = body.save;
  if (save.version !== 1 || JSON.stringify(save).length > 100000) return null;
  // Unfinished expeditions are intentionally never stored or restored.
  const cleanRun = null;
  const settingKeys = ["masterVolume", "musicVolume", "sfxVolume", "screenShake", "damageNumbers", "towerRanges", "developerMode"];
  const settings = {};
  if (save.settings && typeof save.settings === "object") {
    for (const key of settingKeys) if (Object.hasOwn(save.settings, key)) settings[key] = save.settings[key];
  }
  const classIds = ["warden", "arcanist", "huntmaster", "treasurer", "pyromancer", "necromancer"];
  const traitIds = ["bulwarks-oath", "hawks-eye", "coin-scent", "stonebound", "frost-sigil", "ember-heart", "soul-conduit", "siege-savant", "rift-tactician", "golden-forge", "ashen-covenant", "worldbreaker", "crown-of-embers", "eclipse-engine", "soul-of-the-kingdom"];
  const input = save.progression && typeof save.progression === "object" ? save.progression : {};
  const sourceTraits = input.traits && typeof input.traits === "object" ? input.traits : {};
  const owned = {};
  if (sourceTraits.owned && typeof sourceTraits.owned === "object") {
    for (const [id, count] of Object.entries(sourceTraits.owned)) if (traitIds.includes(id) && Number.isFinite(Number(count)) && Number(count) > 0) owned[id] = 1;
  }
  const progression = {
    equippedTrait: traitIds.includes(input.equippedTrait) ? input.equippedTrait : null,
    traits: {
      rolls: Number.isFinite(sourceTraits.rolls) ? Math.max(0, Math.min(1000000, Math.floor(sourceTraits.rolls))) : 0,
      pityLegendary: Number.isFinite(sourceTraits.pityLegendary) ? Math.max(0, Math.min(49, Math.floor(sourceTraits.pityLegendary))) : 0,
      pityMythic: Number.isFinite(sourceTraits.pityMythic) ? Math.max(0, Math.min(1499, Math.floor(sourceTraits.pityMythic))) : 0,
      totalRolls: Number.isFinite(sourceTraits.totalRolls) ? Math.max(0, Math.min(100000000, Math.floor(sourceTraits.totalRolls))) : 0,
      owned,
      redeemedCodes: Array.isArray(sourceTraits.redeemedCodes) ? sourceTraits.redeemedCodes.filter(code => typeof code === "string").map(code => code.toUpperCase()).slice(0, 100) : []
    },
    classes: {}
  };
  for (const id of classIds) {
    const source = input.classes?.[id] || {};
    const nodes = {};
    if (source.nodes && typeof source.nodes === "object") {
      for (const [key, value] of Object.entries(source.nodes)) if (/^[a-z-]{2,40}$/.test(key) && Number.isFinite(value)) nodes[key] = Math.max(0, Math.min(5, Math.floor(value)));
    }
    const choices = {};
    if (source.choices && typeof source.choices === "object") {
      for (const level of ["5", "10", "15", "20"]) if (typeof source.choices[level] === "string" && source.choices[level].length <= 80) choices[level] = source.choices[level];
    }
    progression.classes[id] = {
      xp: Number.isFinite(source.xp) ? Math.max(0, Math.min(10000000, source.xp)) : 0,
      level: Number.isFinite(source.level) ? Math.max(1, Math.min(100, Math.floor(source.level))) : 1,
      skillPoints: Number.isFinite(source.skillPoints) ? Math.max(0, Math.min(10000, Math.floor(source.skillPoints))) : 0,
      spentPoints: Number.isFinite(source.spentPoints) ? Math.max(0, Math.min(10000, Math.floor(source.spentPoints))) : 0,
      totalXp: Number.isFinite(source.totalXp) ? Math.max(0, Math.min(10000000, source.totalXp)) : 0,
      nodes, choices
    };
  }
  return { version: 1, run: cleanRun, settings, progression };
}

app.get("/api/save", async (req, res) => {
  const auth = await verifiedSaveUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  try {
    const result = await pool.query("SELECT save_data, updated_at FROM player_saves WHERE discord_user_id = $1", [auth.userId]);
    if (!result.rowCount) return res.json({ hasSave: false, save: { version: 1, run: null, settings: {}, progression: null } });
    const stored = result.rows[0].save_data || {};
    const save = { version: 1, run: null, settings: stored.settings || {}, progression: stored.progression || null };
    return res.json({ hasSave: true, save, progression: save.progression, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    console.error("Could not load player profile:", error.message);
    return res.status(503).json({ error: "save-service-unavailable" });
  }
});
app.put("/api/save", async (req, res) => {
  const auth = await verifiedSaveUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const save = cleanSave(req.body);
  if (!save) return res.status(400).json({ error: "invalid-save-data" });
  try {
    const result = await pool.query(
      "INSERT INTO player_saves (discord_user_id, save_data, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (discord_user_id) DO UPDATE SET save_data = EXCLUDED.save_data, updated_at = NOW() RETURNING updated_at",
      [auth.userId, JSON.stringify(save)]
    );
    return res.json({ ok: true, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    console.error("Could not store player save:", error.message);
    return res.status(503).json({ error: "save-service-unavailable" });
  }
});

app.post("/api/traits/redeem", async (req, res) => {
  const auth = await verifiedSaveUser(req);
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error });
  const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
  const rewards = { "RIFTBOUND-ROLLTEST": 100, "TESTING": 25 };
  if (!Object.hasOwn(rewards, code)) return res.status(400).json({ ok: false, error: "invalid-code" });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("INSERT INTO player_saves (discord_user_id, save_data) VALUES ($1, $2::jsonb) ON CONFLICT (discord_user_id) DO NOTHING", [auth.userId, JSON.stringify({ version: 1, run: null, settings: {}, progression: { equippedTrait: null, traits: { rolls: 0, pityLegendary: 0, pityMythic: 0, totalRolls: 0, owned: {}, redeemedCodes: [] }, classes: {} } })]);
    const saveResult = await client.query("SELECT save_data FROM player_saves WHERE discord_user_id = $1 FOR UPDATE", [auth.userId]);
    const existingSave = saveResult.rows[0].save_data || {};
    const previousCodes = existingSave.progression?.traits?.redeemedCodes;
    if (Array.isArray(previousCodes) && previousCodes.includes(code)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, error: "code-already-redeemed" });
    }
    const inserted = await client.query("INSERT INTO redeemed_trait_codes (discord_user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code", [auth.userId, code]);
    if (!inserted.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, error: "code-already-redeemed" });
    }
    const stored = existingSave;
    const progression = stored.progression && typeof stored.progression === "object" ? stored.progression : {};
    const traits = progression.traits && typeof progression.traits === "object" ? progression.traits : {};
    traits.rolls = Math.max(0, Math.floor(Number(traits.rolls) || 0)) + rewards[code];
    traits.redeemedCodes = [...new Set([...(Array.isArray(traits.redeemedCodes) ? traits.redeemedCodes : []), code])];
    progression.traits = traits;
    stored.progression = progression;
    await client.query("UPDATE player_saves SET save_data = $2::jsonb, updated_at = NOW() WHERE discord_user_id = $1", [auth.userId, JSON.stringify(stored)]);
    await client.query("COMMIT");
    return res.json({ ok: true, rollsGranted: rewards[code], message: "CODE ACCEPTED · +" + rewards[code] + " TRAIT ROLLS" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Could not redeem trait code:", error.message);
    return res.status(503).json({ ok: false, error: "code-service-unavailable" });
  } finally {
    if (client) client.release();
  }
});

app.delete("/api/save", async (req, res) => {
  const auth = await verifiedSaveUser(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  try {
    await pool.query("DELETE FROM player_saves WHERE discord_user_id = $1", [auth.userId]);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Could not delete player save:", error.message);
    return res.status(503).json({ error: "save-service-unavailable" });
  }
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error.message);
  res.status(500).json({ error: "internal-server-error" });
});

async function startServer() {
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS player_saves (discord_user_id TEXT PRIMARY KEY, save_data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await pool.query("CREATE TABLE IF NOT EXISTS redeemed_trait_codes (discord_user_id TEXT NOT NULL, code TEXT NOT NULL, redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (discord_user_id, code))");
    app.listen(PORT, () => {
      console.log(`Riftbound auth server listening on port ${PORT}`);
      console.log("Player save database is ready.");
    });
  } catch (error) {
    console.error("Could not connect to the player save database:", error.message);
    process.exit(1);
  }
}
startServer();
