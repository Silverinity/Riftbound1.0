import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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
  SESSION_SECRET
} = process.env;

const required = {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_GUILD_ID,
  DISCORD_BETA_ROLE_ID,
  FRONTEND_ORIGIN,
  SESSION_SECRET
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
  methods: ["GET", "POST"]
}));
app.use(express.json({ limit: "10kb" }));

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
  return res.redirect(`${FRONTEND_ORIGIN}/?discord=${encodeURIComponent(status)}`);
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

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error.message);
  res.status(500).json({ error: "internal-server-error" });
});

app.listen(PORT, () => {
  console.log(`Riftbound auth server listening on port ${PORT}`);
});
