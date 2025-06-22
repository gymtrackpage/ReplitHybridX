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

(async () => {
  try {
    console.log("🚀 Starting HybridX server...");

    // Perform startup checks
    const { performStartupChecks } = await import('./startup-check');
    const checksPass = await performStartupChecks();

    if (!checksPass) {
      console.error("❌ Startup checks failed. Exiting...");
      process.exit(1);
    }

    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error(`❌ Server error [${status}]:`, message);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log("🔧 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");
    } else {
      console.log("📦 Setting up static file serving...");
      console.log("🔍 Environment:", process.env.NODE_ENV);
      console.log("🔍 App env:", app.get("env"));
      console.log("🔍 Current directory:", process.cwd());
      console.log("🔍 Server dirname:", import.meta.dirname);
      try {
        serveStatic(app);
        console.log("✅ Static files ready");
      } catch (error) {
        console.error("❌ Static file setup failed:", error);
        throw error;
      }
    }

    // Use PORT environment variable or default to 5000
    // Port 5000 is recommended for Replit as it gets forwarded to 80/443 in production
    const port = parseInt(process.env.PORT || "5000");

    async function killExistingProcesses() {
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        console.log(`🔍 Checking for processes on port ${port}...`);

        try {
          await execAsync(`pkill -f ".*${port}" || true`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log("✅ Cleared any existing processes");
        } catch (error) {
          console.log("⚠️ No existing processes to clear");
        }
      } catch (error) {
        console.log("⚠️ Could not clear existing processes:", error.message);
      }
    }

    async function startServer() {
      try {
        const { db, users } = await import('./db');
        await killExistingProcesses();

        console.log("🔌 Attempting database connection...");
        await db.select().from(users).limit(1);
        console.log("✅ Database connection established successfully");

        console.log("🚀 Starting HybridX server...");
        const { performStartupChecks } = await import('./startup-check');
        console.log("🔍 Performing startup checks...");
        const checksPass = await performStartupChecks();

        if (!checksPass) {
          console.error("❌ Startup checks failed. Exiting...");
          process.exit(1);
        }

        console.log("🎉 All startup checks passed!");
        const server = await registerRoutes(app);

        server.listen(port, "0.0.0.0", () => {
          console.log(`✅ HybridX server running on http://0.0.0.0:${port}`);
          console.log(`🌐 Access your app at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('🛑 Received SIGTERM, shutting down gracefully');
          server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
          });
        });

      } catch (error) {
        console.error("❌ Server error:", error);
        if (error.code === 'EADDRINUSE') {
          console.log(`❌ Port ${port} is still in use after cleanup attempt`);
          console.log("🔄 Please try running the app again in a moment");
        }
        process.exit(1);
      }
    }

    startServer();

    // Handle server errors
    // server.on('error', (error: any) => {
    //   console.error('❌ Server error:', error);
    //   if (error.code === 'EADDRINUSE') {
    //     console.error(`Port ${port} is already in use. Trying to kill existing process...`);
    //   }
    // });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();