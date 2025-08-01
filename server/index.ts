
import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Disable for development
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  } : false
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    console.log("🚀 Starting HybridX server...");

    // Perform startup checks
    const { performStartupChecks } = await import('./startup-check');
    const checksPass = await performStartupChecks();

    if (!checksPass) {
      console.error("❌ Startup checks failed. Exiting...");
      process.exit(1);
    }

    // Register routes and get server instance
    const server = await registerRoutes(app);
    console.log("✅ Routes registered successfully");

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Structured error logging
      const errorLog = {
        timestamp: new Date().toISOString(),
        status,
        message,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        body: req.method === 'POST' ? JSON.stringify(req.body).slice(0, 500) : undefined
      };

      console.error(`❌ Server error [${status}]:`, JSON.stringify(errorLog, null, 2));

      // Don't expose internal errors in production
      const clientMessage = status >= 500 && process.env.NODE_ENV === 'production' 
        ? "Internal Server Error" 
        : message;

      res.status(status).json({ 
        message: clientMessage,
        timestamp: errorLog.timestamp,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // Setup Vite or static files
    if (app.get("env") === "development") {
      console.log("🔧 Setting up Vite development server...");
      await setupVite(app, server);
      console.log("✅ Vite development server ready");
    } else {
      console.log("📦 Setting up static file serving...");
      try {
        serveStatic(app);
        console.log("✅ Static files ready");
      } catch (error) {
        console.error("❌ Static file setup failed:", error);
        throw error;
      }
    }

    // Use PORT environment variable or default to 5000
    const port = parseInt(process.env.PORT || "5000");

    // Handle server startup errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please stop any running processes and try again.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ HybridX server running on http://0.0.0.0:${port}`);
      console.log(`🌐 Access your app at: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'username'}.repl.co`);
      console.log(`📍 Local access: http://0.0.0.0:${port}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
