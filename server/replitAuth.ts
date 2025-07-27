import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export async function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  // Try to use PostgreSQL store first, fallback to memory store if DB issues
  let sessionStore;
  try {
    const { db } = await import('./db');
    
    // Test database connection first
    await db.execute(sqlOperator`SELECT 1`);
    
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      pool: db as any, // Cast for compatibility
      createTableIfMissing: true,
      ttl: sessionTtl / 1000,
      tableName: "sessions",
      pruneSessionInterval: 24 * 60 * 60,
      schemaName: 'public',
    });
    console.log("✅ Using PostgreSQL session store");
  } catch (error) {
    console.warn("⚠️ PostgreSQL session store failed, using memory store:", error.message);
    // Fallback to memory store if database connection fails
    sessionStore = new session.MemoryStore();
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true, // Changed to true to ensure session persistence
    saveUninitialized: false,
    rolling: true,
    name: 'hybridx.sid',
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: sessionTtl,
      sameSite: 'lax',
      path: '/',
    },
    touchAfter: 60 * 60, // Touch session every hour instead of daily
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(await getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      console.error("Auth verification error:", error);
      verified(error, null);
    }
  };

  // Get the current domain or use the first Replit domain
  const currentDomain = process.env.REPLIT_DOMAINS!.split(",")[0];

  // Create a single strategy that works for all domains
  const strategy = new Strategy(
    {
      name: `replitauth:main`,
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${currentDomain}/api/callback`,
    },
    verify,
  );
  passport.use(strategy);

  // Fallback strategy for any domain variations
  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    if (domain !== currentDomain) {
      const fallbackStrategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(fallbackStrategy);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    try {
      console.log("Login attempt from hostname:", req.hostname);

      // Try main strategy first, fallback to hostname-specific if needed
      let strategyName = 'replitauth:main';
      const hostname = req.hostname;

      // Check if we have a specific strategy for this hostname
      const replitDomains = process.env.REPLIT_DOMAINS!.split(",");
      if (replitDomains.includes(hostname) && hostname !== replitDomains[0]) {
        strategyName = `replitauth:${hostname}`;
      }

      console.log("Using auth strategy:", strategyName);

      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  // Custom branded login route
  app.get("/api/auth/login", (req, res, next) => {
    try {
      console.log("Auth login attempt from hostname:", req.hostname);

      // Use same logic as /api/login
      let strategyName = 'replitauth:main';
      const hostname = req.hostname;

      const replitDomains = process.env.REPLIT_DOMAINS!.split(",");
      if (replitDomains.includes(hostname) && hostname !== replitDomains[0]) {
        strategyName = `replitauth:${hostname}`;
      }

      console.log("Using auth strategy:", strategyName);

      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("Auth login error:", error);
      res.redirect("/?error=auth_failed");
    }
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Auth callback received from hostname:", req.hostname);
    console.log("Callback query params:", req.query);

    // Use same strategy selection logic
    let strategyName = 'replitauth:main';
    const hostname = req.hostname === 'localhost' ? 
      process.env.REPLIT_DOMAINS!.split(",")[0] : 
      req.hostname;

    const replitDomains = process.env.REPLIT_DOMAINS!.split(",");
    if (replitDomains.includes(hostname) && hostname !== replitDomains[0]) {
      strategyName = `replitauth:${hostname}`;
    }

    console.log("Callback using auth strategy:", strategyName);

    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/dashboard",
      failureRedirect: "/?error=auth_callback_failed",
      failureFlash: false
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  console.log("Auth check - isAuthenticated:", req.isAuthenticated());
  console.log("Auth check - user exists:", !!user);

  if (!req.isAuthenticated() || !user) {
    console.log("Authentication failed - no session or user");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Always touch session to maintain activity-based persistence
  if (req.session.touch) {
    req.session.touch();
  }

  // If no expiry time, assume valid and continue (common for persistent sessions)
  if (!user.expires_at) {
    console.log("No expiry time found, allowing access");
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  const gracePeriod = 7 * 24 * 60 * 60; // 7 days grace period

  // Only attempt refresh/logout if token is significantly expired
  if (now > (user.expires_at + gracePeriod)) {
    console.log("Token significantly expired, attempting refresh");
    const refreshToken = user.refresh_token;
    
    if (!refreshToken) {
      console.log("No refresh token available, session expired");
      req.logout(() => {
        res.status(401).json({ message: "Session expired, please log in again" });
      });
      return;
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      console.log("Token refreshed successfully");
      return next();
    } catch (error) {
      console.error("Token refresh failed:", error);
      req.logout(() => {
        res.status(401).json({ message: "Session expired, please log in again" });
      });
      return;
    }
  }

  // Token is still valid or within grace period
  console.log("Session valid, allowing access");
  return next();
};