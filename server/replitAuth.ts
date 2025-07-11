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

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000, // PostgreSQL store expects seconds, not milliseconds
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset expiry on each request
    name: 'hybridx.sid', // Custom session name
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for Replit deployment
      maxAge: sessionTtl,
      sameSite: 'lax', // Better cross-site compatibility
      path: '/', // Ensure cookie is available for all paths
    },
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
  app.use(getSession());
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
  console.log("Auth check - user expires_at:", user?.expires_at);

  if (!req.isAuthenticated() || !user) {
    console.log("Authentication failed - no session or user");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If no expiry time, assume valid and extend session
  if (!user.expires_at) {
    console.log("No expiry time found, allowing access and extending session");
    // Touch session to keep it alive
    req.session.touch();
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 300; // 5 minutes buffer before expiry
  
  if (now <= (user.expires_at - bufferTime)) {
    console.log("Token still valid, extending session");
    // Touch session to keep it alive
    req.session.touch();
    return next();
  }

  console.log("Token near expiry or expired, attempting refresh");
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("No refresh token available, clearing session");
    req.logout(() => {
      res.status(401).json({ message: "Session expired, please log in again" });
    });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    // Touch session to keep it alive after refresh
    req.session.touch();
    console.log("Token refreshed successfully");
    return next();
  } catch (error) {
    console.error("Token refresh failed:", error);
    req.logout(() => {
      res.status(401).json({ message: "Session expired, please log in again" });
    });
    return;
  }
};
