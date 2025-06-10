import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function startServer() {
  try {
    // Check for required environment variables with better error handling
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL environment variable is not set");
      console.error("📋 For deployment, ensure DATABASE_URL is configured as a production secret");
      console.error("🔧 Add DATABASE_URL to your deployment environment variables");
      
      // In production, wait a bit to help with deployment diagnostics
      if (process.env.NODE_ENV === "production") {
        console.error("⏳ Waiting 30 seconds before exit to allow deployment logs to be captured...");
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    const server = await registerRoutes(app);
    console.log("✅ Database connected successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`❌ Server error: ${message}`);
      res.status(status).json({ message });
      
      // Don't throw in production to prevent crash loops
      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT environment variable for deployment compatibility
    // Default to 5000 for local development
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 Server running on port ${port}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Server listening on http://0.0.0.0:${port}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("🔧 Check your environment variables and database connection");
    process.exit(1);
  }
}

startServer();
