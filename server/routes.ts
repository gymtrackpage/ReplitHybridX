import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { StravaService } from "./stravaService";
import { StravaImageService } from "./stravaImageService";
import { generateRandomHyroxWorkout } from "./enhancedHyroxWorkoutGenerator";
import multer from "multer";
import * as XLSX from "xlsx";
import { selectHyroxProgram, HYROX_PROGRAMS } from "./programSelection";
import { loadProgramsFromCSV, calculateProgramSchedule } from "./programLoader";
import { determineUserProgramPhase, transitionUserToPhase, checkForPhaseTransition } from "./programPhaseManager";
import { seedHyroxPrograms } from "./seedData";
import { createMinimalPrograms } from "./quickProgramSetup";
import Stripe from "stripe";
import { insertProgramSchema, insertWorkoutSchema, insertAssessmentSchema, insertWeightEntrySchema } from "../shared/schema";
import { generateReferralCode, trackReferral, processReferralReward, getUserReferralStats, createReferralUrl } from "./referralService";
import { db } from "./db";
import { workouts, workoutCompletions, users, programs } from "../shared/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import { rateLimit } from "./middleware";

// Rate limiting configurations
const generalRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const authRateLimit = rateLimit(15 * 60 * 1000, 20); // 20 auth requests per 15 minutes
const uploadRateLimit = rateLimit(60 * 60 * 1000, 5); // 5 uploads per hour

// Enhanced async error wrapper with logging
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(`Error in ${req.method} ${req.path}:`, error);
    next(error);
  });
};

// Environment validation
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
};

const optionalEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
};

// Check required environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
  } else {
    console.log(`✅ Required environment variable set: ${key}`);
  }
}

// Check optional environment variables
console.log("🔧 Optional environment variables:");
for (const [key, value] of Object.entries(optionalEnvVars)) {
  if (value) {
    console.log(`✅ ${key}: configured`);
  } else {
    console.log(`⚠️  ${key}: not configured`);
  }
}

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('Stripe not initialized: STRIPE_SECRET_KEY not provided');
}

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: { claims: { sub: string } };
  isAuthenticated?: () => boolean;
}

// Admin middleware
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Configure multer for file uploads with better limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit (reduced from 10MB)
    files: 1, // Only allow 1 file upload at a time
    fields: 10, // Limit number of fields
    fieldSize: 1024 * 1024 // 1MB per field
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV and XLSX files
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype) || 
        file.originalname?.endsWith('.csv') || 
        file.originalname?.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and XLSX files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Stripe configuration validation endpoint
  app.get('/api/stripe/validate', isAuthenticated, async (req: any, res) => {
    try {
      const validationResults = {
        stripeConfigured: !!stripe,
        priceIdValid: false,
        webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        errors: []
      };

      if (!stripe) {
        validationResults.errors.push("Stripe secret key not configured");
        return res.json(validationResults);
      }

      // Validate price ID
      try {
        const price = await stripe.prices.retrieve('price_1RgOOZGKLIEfAkDGfqPezReg');
        validationResults.priceIdValid = true;
        validationResults.priceDetails = {
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.active
        };
      } catch (priceError) {
        validationResults.errors.push(`Price ID price_1RgOOZGKLIEfAkDGfqPezReg not found in Stripe`);
      }

      res.json(validationResults);
    } catch (error) {
      console.error("Stripe validation error:", error);
      res.status(500).json({ 
        message: "Failed to validate Stripe configuration",
        error: error.message 
      });
    }
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        stripe: stripe ? 'initialized' : 'not_configured',
        environment: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          NODE_ENV: process.env.NODE_ENV || 'development'
        }
      }
    };

    try {
      // Test database connection with timeout
      const dbTest = Promise.race([
        storage.getPrograms(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        )
      ]);

      await dbTest;
      healthStatus.checks.database = 'connected';
      console.log('✅ Health check passed');
      res.json(healthStatus);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      healthStatus.status = 'unhealthy';
      healthStatus.checks.database = 'failed';

      // Provide more specific error information
      let errorMessage = 'Database connection failed';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Database connection timeout';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Database host not found';
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Database authentication failed';
        } else {
          errorMessage = error.message;
        }
      }

      res.status(503).json({ 
        ...healthStatus,
        error: errorMessage
      });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Initialize programs endpoint
  app.post('/api/init-programs', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Loading all HYROX programs and workouts...");
      await createMinimalPrograms();
      const programs = await storage.getPrograms();
      let totalWorkouts = 0;
      for (const program of programs) {
        const workouts = await storage.getWorkoutsByProgram(program.id);
        totalWorkouts += workouts.length;
      }
      res.json({ 
        message: "All HYROX programs and workouts initialized", 
        programCount: programs.length,
        workoutCount: totalWorkouts,
        programs: programs.map(p => ({ id: p.id, name: p.name, category: p.category }))
      });
    } catch (error) {
      console.error("Error initializing programs:", error);
      res.status(500).json({ message: "Failed to initialize programs" });
    }
  });

  // Programs will be created on-demand during assessment

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User onboarding status check
  app.get('/api/user-onboarding-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        console.error("User not found for onboarding status check:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      const response = {
        assessmentCompleted: user.assessmentCompleted || false,
        subscriptionStatus: user.subscriptionStatus || "none",
        currentProgramId: user.currentProgramId,
        hasCompletedOnboarding: (user.assessmentCompleted && user.subscriptionStatus !== "none"),
        userId: userId,
        timestamp: new Date().toISOString()
      };

      console.log("Onboarding status response for user", userId, ":", response);
      res.json(response);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  // User profile with assessment data
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const assessment = await storage.getUserAssessment(userId);
      const progress = await storage.getUserProgress(userId);
      const completions = await storage.getWorkoutCompletions(userId);

      res.json({
        user,
        assessment,
        progress,
        completions,
        totalCompletions: completions.length
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Dashboard data
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Dashboard request for user:", userId);

      const user = await storage.getUser(userId);
      console.log("User found:", !!user);

      const progress = await storage.getUserProgress(userId);
      console.log("Progress found:", !!progress, progress ? `Program ID: ${progress.programId}` : 'No progress');

      const todaysWorkout = await storage.getTodaysWorkout(userId);
      console.log("Today's workout found:", !!todaysWorkout);

      const weeklyCompletions = await storage.getWeeklyCompletions(userId);
      const weightEntries = await storage.getUserWeightEntries(userId);

      res.json({
        user,
        progress,
        todaysWorkout,
        weeklyCompletions,
        weightEntries: weightEntries.slice(0, 10), // Latest 10 entries
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Additional API endpoints for frontend data
  app.get('/api/today-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todaysWorkout = await storage.getTodaysWorkout(userId);
      res.json(todaysWorkout);
    } catch (error) {
      console.error("Error fetching today's workout:", error);
      res.status(500).json({ message: "Failed to fetch today's workout" });
    }
  });

  app.get('/api/user-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      const user = await storage.getUser(userId);
      const completions = await storage.getWorkoutCompletions(userId);

      res.json({
        ...progress,
        streak: user?.streak || 0,
        totalWorkouts: completions.length,
        weeklyCompleted: await storage.getWeeklyCompletions(userId).then(comps => comps.length)
      });
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  app.get('/api/weekly-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weeklyCompletions = await storage.getWeeklyCompletions(userId);

      res.json({
        completed: weeklyCompletions.length,
        target: 6, // Assuming 6 workouts per week target
        percentage: Math.round((weeklyCompletions.length / 6) * 100)
      });
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  // Get workout calendar data
  app.get('/api/workout-calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const monthYear = req.query.month;

      console.log(`Calendar API called for user ${userId}, month: ${monthYear}`);

      if (!monthYear || typeof monthYear !== 'string' || !monthYear.match(/^\d{4}-\d{2}$/)) {
        return res.status(400).json({ 
          message: "Month parameter required in YYYY-MM format",
          received: monthYear 
        });
      }

      // Get user and check access level
      const user = await storage.getUser(userId);
      const userProgress = await storage.getUserProgress(userId);

      console.log(`User assessment completed: ${user?.assessmentCompleted}, has program: ${!!userProgress?.programId}`);

      // Check if user has proper access to programs
      const hasAssessment = user?.assessmentCompleted;
      const hasActiveProgram = userProgress?.programId;
      const isAdmin = user?.isAdmin;
      const isPremium = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'free_trial';

      // Only show calendar for users with proper access
      if (!isAdmin && !hasAssessment) {
        console.log(`No assessment completed for user ${userId}`);
        return res.json({ workouts: [], message: "Assessment not completed" });
      }

      if (!hasActiveProgram) {
        console.log(`No active program for user ${userId}`);
        return res.json({ workouts: [], message: "No active program" });
      }

      // Get ALL workout completions for the user
      const allCompletions = await db
        .select()
        .from(workoutCompletions)
        .where(eq(workoutCompletions.userId, userId))
        .orderBy(desc(workoutCompletions.completedAt));

      console.log(`Found ${allCompletions.length} total completions for user ${userId}`);

      // Create calendar entries from completion data
      const calendarWorkouts = [];

      // Add all completed/skipped workouts for the requested month
      for (const completion of allCompletions) {
        try {
          const completedDate = new Date(completion.completedAt);
          const completedMonthYear = completedDate.toISOString().substring(0, 7); // YYYY-MM

          // Only include workouts for the requested month
          if (completedMonthYear === monthYear) {
            const workout = await storage.getWorkout(completion.workoutId);
            if (workout) {
              calendarWorkouts.push({
                date: completedDate.toISOString().split('T')[0],
                status: completion.skipped ? 'skipped' : 'completed',
                workout: {
                  id: workout.id,
                  name: workout.name,
                  description: workout.description || '',
                  estimatedDuration: workout.estimatedDuration || workout.duration || 60,
                  workoutType: workout.workoutType || 'Training',
                  week: workout.week || 0,
                  day: workout.day || 0,
                  exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
                  completedAt: completion.completedAt,
                  duration: completion.duration || null,
                  comments: completion.notes || null,
                  rating: completion.rating || null,
                  completionId: completion.id
                }
              });
            } else {
              console.warn(`Workout ${completion.workoutId} not found for completion ${completion.id}`);
            }
          }
        } catch (completionError) {
          console.error(`Error processing completion ${completion.id}:`, completionError);
        }
      }

      // Generate scheduled workouts for the month if user has premium access
      if ((isPremium || isAdmin) && userProgress && userProgress.startDate) {
        try {
          const startDate = new Date(userProgress.startDate);
          const monthStart = new Date(monthYear + '-01');
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          
          // Get all workouts for the user's program
          const programWorkouts = await db
            .select()
            .from(workouts)
            .where(eq(workouts.programId, userProgress.programId))
            .orderBy(asc(workouts.week), asc(workouts.day));

          console.log(`Found ${programWorkouts.length} program workouts for program ${userProgress.programId}`);

          // Generate scheduled workouts for each day in the month
          for (let currentDate = new Date(Math.max(monthStart.getTime(), startDate.getTime())); 
               currentDate <= monthEnd; 
               currentDate.setDate(currentDate.getDate() + 1)) {
            
            const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Skip if this date already has a completion
            const hasCompletion = calendarWorkouts.some(w => w.date === dateString);
            if (hasCompletion) {
              continue;
            }
            
            // Calculate what workout should be scheduled for this day
            // Assume 6 training days per week (Monday to Saturday)
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Skip Sundays (rest day)
            if (dayOfWeek === 0) {
              continue;
            }
            
            // Calculate week and day in program
            const weeksSinceStart = Math.floor(daysSinceStart / 7);
            const programWeek = weeksSinceStart + 1;
            const programDay = dayOfWeek; // 1 = Monday, 2 = Tuesday, etc.
            
            // Find the workout for this week and day
            const scheduledWorkout = programWorkouts.find(w => 
              w.week === programWeek && w.day === programDay
            );
            
            if (scheduledWorkout) {
              // Determine status based on date
              const today = new Date();
              const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              
              let status = 'upcoming';
              if (currentDateOnly.getTime() < todayOnly.getTime()) {
                status = 'missed'; // Past date with no completion
              } else if (currentDateOnly.getTime() === todayOnly.getTime()) {
                status = 'upcoming'; // Today's workout
              }
              
              calendarWorkouts.push({
                date: dateString,
                status: status,
                workout: {
                  id: scheduledWorkout.id,
                  name: scheduledWorkout.name,
                  description: scheduledWorkout.description || '',
                  estimatedDuration: scheduledWorkout.estimatedDuration || scheduledWorkout.duration || 60,
                  workoutType: scheduledWorkout.workoutType || 'Training',
                  week: scheduledWorkout.week || 0,
                  day: scheduledWorkout.day || 0,
                  exercises: Array.isArray(scheduledWorkout.exercises) ? scheduledWorkout.exercises : []
                }
              });
            }
          }
        } catch (scheduleError) {
          console.error("Error generating scheduled workouts:", scheduleError);
        }
      }

      // Sort workouts by date
      calendarWorkouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`Calendar: Returning ${calendarWorkouts.length} workouts for ${monthYear}, user ${userId}`);

      res.json({ 
        workouts: calendarWorkouts,
        userAccess: {
          hasAssessment,
          hasActiveProgram,
          isPremium,
          isAdmin
        }
      });
    } catch (error) {
      console.error("Error fetching workout calendar:", error);
      res.status(500).json({ 
        message: "Failed to fetch workout calendar",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/recent-activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completions = await storage.getWorkoutCompletions(userId);

      // Get workout details for recent completions
      const recentActivity = await Promise.all(
        completions.slice(0, 10).map(async (completion) => {
          const workout = await storage.getWorkout(completion.workoutId);
          return {
            id: completion.id,
            name: workout?.name || 'Workout',
            completedAt: completion.completedAt,
            duration: completion.duration || workout?.estimatedDuration || 0,
            status: 'completed'
          };
        })
      );

      res.json(recentActivity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Get next 3 days of upcoming workouts
  app.get('/api/upcoming-workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const progress = await storage.getUserProgress(userId);

      if (!user?.currentProgramId || !progress) {
        return res.json([]);
      }

      const upcomingWorkouts = [];
      let currentWeek = progress.currentWeek || 1;
      let currentDay = progress.currentDay || 1;

      // Get next 3 workouts starting from current position
      for (let i = 0; i < 3; i++) {
        // For the first iteration, use current position, then advance
        let searchWeek = currentWeek;
        let searchDay = currentDay;

        if (i > 0) {
          // Calculate the next workout position
          searchDay = currentDay + i;
          while (searchDay > 6) { // Assuming 6 training days per week
            searchDay -= 6;
            searchWeek++;
          }
        }

        const [workout] = await db
          .select()
          .from(workouts)
          .where(
            and(
              eq(workouts.programId, progress.programId),
              eq(workouts.week, searchWeek),
              eq(workouts.day, searchDay)
            )
          );

        if (workout) {
          upcomingWorkouts.push({
            ...workout,
            daysFromNow: i,
            workoutType: workout.workoutType || 'Training'
          });
        }
      }

      res.json(upcomingWorkouts);
    } catch (error) {
      console.error("Error fetching upcoming workouts:", error);
      res.status(500).json({ message: "Failed to fetch upcoming workouts" });
    }
  });

  // Get recent workouts from last 3 days
  app.get('/api/recent-workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentCompletions = await db
        .select()
        .from(workoutCompletions)
        .where(
          and(
            eq(workoutCompletions.userId, userId),
            gte(workoutCompletions.completedAt, threeDaysAgo)
          )
        )
        .orderBy(desc(workoutCompletions.completedAt))
        .limit(10);

      // Get workout details for recent completions
      const recentWorkouts = await Promise.all(
        recentCompletions.map(async (completion) => {
          const workout = await storage.getWorkout(completion.workoutId);
          return {
            id: completion.id,
            workoutId: completion.workoutId,
            name: workout?.name || 'Workout',
            description: workout?.description || '',
            completedAt: completion.completedAt,
            duration: completion.duration || workout?.estimatedDuration || 0,
            status: completion.skipped ? 'skipped' : 'completed',
            estimatedDuration: workout?.estimatedDuration || 0,
            workoutType: workout?.workoutType || 'Training',
            week: workout?.week || 0,
            day: workout?.day || 0,
            rating: completion.rating,
            notes: completion.notes
          };
        })
      );

      res.json(recentWorkouts);
    } catch (error) {
      console.error("Error fetching recent workouts:", error);
      res.status(500).json({ message: "Failed to fetch recent workouts" });
    }
  });

  app.get('/api/user-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const completions = await storage.getWorkoutCompletions(userId);
      const weeklyCompletions = await storage.getWeeklyCompletions(userId);

      res.json({
        totalWorkouts: completions.length,
        currentStreak: user?.streak || 0,
        weeklyAverage: Math.round(weeklyCompletions.length / 4), // Approximate weekly average
        memberSince: user?.createdAt
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get('/api/progress-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completions = await storage.getWorkoutCompletions(userId);
      const user = await storage.getUser(userId);

      // Generate chart data for last 8 weeks
      const chartData = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekCompletions = completions.filter(c => {
          const completedDate = new Date(c.completedAt);
          return completedDate >= weekStart && completedDate <= weekEnd;
        });

        chartData.push({
          week: 8 - i,
          completed: weekCompletions.length
        });
      }

      res.json({
        totalWorkouts: completions.length,
        weeklyCompleted: await storage.getWeeklyCompletions(userId).then(comps => comps.length),
        totalMinutes: completions.reduce((sum, c) => sum + (c.duration || 0), 0),
        achievements: [], // Placeholder for achievements
        chartData
      });
    } catch (error) {
      console.error("Error fetching progress stats:", error);
      res.status(500).json({ message: "Failed to fetch progress stats" });
    }
  });

  app.get('/api/workout-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completions = await storage.getWorkoutCompletions(userId);

      const workoutHistory = await Promise.all(
        completions.map(async (completion) => {
          const workout = await storage.getWorkout(completion.workoutId);
          return {
            id: completion.id,
            name: workout?.name || 'Workout',
            completedAt: completion.completedAt,
            week: workout?.week || 0,
            day: workout?.day || 0,
            estimatedDuration: workout?.estimatedDuration || 0,
            status: 'completed'
          };
        })
      );

      res.json(workoutHistory);
    } catch (error) {
      console.error("Error fetching workout history:", error);
      res.status(500).json({ message: "Failed to fetch workout history" });
    }
  });

  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      res.json({
        status: user?.subscriptionStatus || 'inactive',
        nextBillingDate: null // Would be populated from Stripe in production
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Programs routes
  app.get('/api/programs', async (req, res) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get('/api/programs/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      if (!progress) {
        return res.json(null);
      }

      const program = await storage.getProgram(progress.programId);
      if (!program) {
        return res.json(null);
      }

      const workouts = await storage.getWorkoutsByProgram(progress.programId);
      res.json({ ...program, workouts });
    } catch (error) {
      console.error("Error fetching current program:", error);
      res.status(500).json({ message: "Failed to fetch current program" });
    }
  });

  app.get('/api/programs/:id', async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      if (isNaN(programId)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      const workouts = await storage.getWorkoutsByProgram(programId);
      res.json({ ...program, workouts });
    } catch (error) {
      console.error("Error fetching program:", error);
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  app.post('/api/programs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const programData = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(programData);
      res.json(program);
    } catch (error) {
      console.error("Error creating program:", error);
      res.status(500).json({ message: "Failed to create program" });
    }
  });

  // Program selection
  app.post('/api/select-program', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.body;

      // Update user's current program
      await storage.updateUserProgram(userId, programId);

      // Get program details to calculate total workouts
      const program = await storage.getProgram(programId);
      const programWorkouts = await storage.getWorkoutsByProgram(programId);
      const totalWorkouts = programWorkouts.length;

      // Check if user already has progress
      const existingProgress = await storage.getUserProgress(userId);

      if (existingProgress) {
        // Update existing progress for new program
        await storage.updateUserProgress(userId, {
          programId,
          currentWeek: 1,
          currentDay: 1,
          startDate: new Date().toISOString(),
          completedWorkouts: 0,
          totalWorkouts,
        });
      } else {
        // Create initial progress tracking
        await storage.createUserProgress({
          userId,
          programId,
          currentWeek: 1,
          currentDay: 1,
          startDate: new Date().toISOString(),
          completedWorkouts: 0,
          totalWorkouts,
        });
      }

      res.json({ success: true, message: "Program selected successfully" });
    } catch (error) {
      console.error("Error selecting program:", error);
      res.status(500).json({ message: "Failed to select program" });
    }
  });

  // Change program endpoint with start options
  app.put('/api/change-program', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId, startOption, eventDate } = req.body;

      // Get the new program details
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Update user's current program
      await storage.updateUserProgram(userId, programId);

      // Get existing progress
      const existingProgress = await storage.getUserProgress(userId);

      let startDate = new Date();
      let currentWeek = 1;
      let currentDay = 1;
      let totalWorkouts = (program.duration || 12) * (program.frequency || 6);

      // Handle different start options
      switch (startOption) {
        case "continue":
          // Keep current week/day if user has existing progress
          if (existingProgress) {
            currentWeek = existingProgress.currentWeek || 1;
            currentDay = existingProgress.currentDay || 1;
          }
          break;

        case "beginning":
          // Start from week 1, day 1 (default values already set)
          break;

        case "eventDate":
          if (eventDate) {
            const event = new Date(eventDate);
            const today = new Date();
            const daysUntilEvent = Math.ceil((event.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            const programDuration = program.duration || 12;
            const totalDaysInProgram = ((programDuration - 1) * 7) + 6; // Week 12, Day 6 = 83 days total

            if (daysUntilEvent < totalDaysInProgram) {
              // Event is closer than full program duration - start at appropriate week/day
              const daysToSkip = totalDaysInProgram - daysUntilEvent;
              currentWeek = Math.floor(daysToSkip / 7) + 1;
              currentDay = (daysToSkip % 7) + 1;

              // Ensure we don't exceed program duration
              if (currentWeek > programDuration) {
                currentWeek = programDuration;
                currentDay = 6;
              }

              startDate = new Date(today);
            } else {
              // Event is far enough away - calculate normal start date
              const startDateMs = event.getTime() - (totalDaysInProgram * 24 * 60 * 60 * 1000);
              startDate = new Date(startDateMs);

              // If calculated start date is in the future, use today
              if (startDate > today) {


  // Debug endpoint for calendar troubleshooting
  app.get('/api/debug/calendar-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const userProgress = await storage.getUserProgress(userId);
      const completions = await storage.getWorkoutCompletions(userId);
      
      let programWorkouts = [];
      if (userProgress?.programId) {
        programWorkouts = await db
          .select()
          .from(workouts)
          .where(eq(workouts.programId, userProgress.programId))
          .orderBy(asc(workouts.week), asc(workouts.day));
      }

      const debugData = {
        user: {
          id: userId,
          assessmentCompleted: user?.assessmentCompleted,
          subscriptionStatus: user?.subscriptionStatus,
          currentProgramId: user?.currentProgramId,
          isAdmin: user?.isAdmin
        },
        userProgress: {
          programId: userProgress?.programId,
          startDate: userProgress?.startDate,
          currentWeek: userProgress?.currentWeek,
          currentDay: userProgress?.currentDay,
          completedWorkouts: userProgress?.completedWorkouts
        },
        programWorkouts: {
          count: programWorkouts.length,
          sampleWorkouts: programWorkouts.slice(0, 3).map(w => ({
            id: w.id,
            week: w.week,
            day: w.day,
            name: w.name
          }))
        },
        completions: {
          count: completions.length,
          recent: completions.slice(0, 3).map(c => ({
            id: c.id,
            workoutId: c.workoutId,
            completedAt: c.completedAt,
            skipped: c.skipped
          }))
        }
      };

      res.json(debugData);
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

                startDate = new Date(today);
              }
            }
          }
          break;

        default:
          // Default to beginning
          break;
      }

      // Update or create progress tracking
      if (existingProgress) {
        await storage.updateUserProgress(userId, {
          programId: programId,
          currentWeek: currentWeek,
          currentDay: currentDay,
          startDate: startDate.toISOString(),
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          totalWorkouts: totalWorkouts,
          completedWorkouts: startOption === "continue" ? existingProgress.completedWorkouts : 0
        });
      } else {
        await storage.createUserProgress({
          userId,
          programId,
          currentWeek: currentWeek,
          currentDay: currentDay,
          startDate: startDate.toISOString(),
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          completedWorkouts: 0,
          totalWorkouts: totalWorkouts
        });
      }

      // Update user profile with new event date if provided
      if (eventDate) {
        await storage.updateUserProfile(userId, {
          hyroxEventDate: new Date(eventDate),
          updatedAt: new Date()
        });
      }

      // Get updated user data to return
      const updatedUser = await storage.getUser(userId);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error changing program:", error);
      res.status(500).json({ message: "Failed to change program" });
    }
  });

  // Workout routes
  app.get('/api/workouts/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todaysWorkout = await storage.getTodaysWorkout(userId);
      res.json(todaysWorkout);
    } catch (error) {
      console.error("Error fetching today's workout:", error);
      res.status(500).json({ message: "Failed to fetch today's workout" });
    }
  });

  app.get('/api/workouts/:id', async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      if (isNaN(workoutId)) {
        return res.status(400).json({ message: "Invalid workout ID" });
      }
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      res.json(workout);
    } catch (error) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ message: "Failed to fetch workout" });
    }
  });

  app.post('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const workoutData = insertWorkoutSchema.parse(req.body);
      const workout = await storage.createWorkout(workoutData);
      res.json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  // Workout completion
  app.post('/api/complete-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, duration, notes, exerciseData } = req.body;

      // Record completion
      await storage.createWorkoutCompletion({
        userId,
        workoutId,
        duration,
        notes,
        exerciseData,
      });

      // Update progress
      const progress = await storage.getUserProgress(userId);
      if (progress) {
        await storage.updateUserProgress(userId, {
          completedWorkouts: (progress.completedWorkouts || 0) + 1,
          lastWorkoutDate: new Date().toISOString().split('T')[0] as any,
          currentDay: (progress.currentDay || 0) + 1,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error completing workout:", error);
      res.status(500).json({ message: "Failed to complete workout" });
    }
  });

  app.post('/api/skip-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Update progress to next day
      const progress = await storage.getUserProgress(userId);
      if (progress) {
        await storage.updateUserProgress(userId, {
          currentDay: (progress.currentDay || 0) + 1,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error skipping workout:", error);
      res.status(500).json({ message: "Failed to skip workout" });
    }
  });

  

  // Get program recommendation (without saving assessment)
  app.post('/api/get-program-recommendation', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Getting program recommendation for assessment data:", req.body);

      // Use your program selection algorithm
      const programRecommendation = selectHyroxProgram(req.body);
      console.log("Generated program recommendation:", programRecommendation);

      res.json({
        programRecommendation,
        success: true
      });
    } catch (error) {
      console.error("Error generating program recommendation:", error);
      res.status(500).json({ message: "Failed to generate program recommendation" });
    }
  });

  // Complete assessment after payment success or free trial selection
  app.post('/api/complete-assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assessmentData, programId, subscriptionChoice, paymentIntentId } = req.body;

      console.log("Completing assessment for user:", userId, "with choice:", subscriptionChoice);

      // Validate required data
      if (!assessmentData || !programId || !subscriptionChoice) {
        return res.status(400).json({ 
          message: "Missing required assessment data",
          required: ["assessmentData", "programId", "subscriptionChoice"]
        });
      }

      // Check if assessment already exists to prevent duplicates
      const existingAssessment = await storage.getUserAssessment(userId);
      if (existingAssessment) {
        console.log("Assessment already exists for user:", userId, "- updating user profile only");
      } else {
        // Create assessment record with comprehensive data - this is critical and should not fail silently
        try {
          // Ensure all required assessment fields are present
          const completeAssessmentData = {
            userId,
            data: JSON.stringify(assessmentData),
            hyroxEventsCompleted: assessmentData.hyroxEventsCompleted || 0,
            bestFinishTime: assessmentData.bestFinishTime || null,
            generalFitnessYears: assessmentData.generalFitnessYears || 0,
            primaryTrainingBackground: assessmentData.primaryTrainingBackground || 'general',
            weeklyTrainingDays: assessmentData.weeklyTrainingDays || 3,
            avgSessionLength: assessmentData.avgSessionLength || 60,
            competitionFormat: assessmentData.competitionFormat || 'singles',
            age: assessmentData.age || 30,
            injuryHistory: assessmentData.injuryHistory || false,
            injuryRecent: assessmentData.injuryRecent || false,
            kilometerRunTime: assessmentData.kilometerRunTime || null,
            squatMaxReps: assessmentData.squatMaxReps || null,
            goals: Array.isArray(assessmentData.goals) ? assessmentData.goals.join(',') : (assessmentData.goals || 'general-fitness'),
            equipmentAccess: assessmentData.equipmentAccess || 'full_gym',
            createdAt: new Date()
          };
          
          const assessment = await storage.createAssessment(completeAssessmentData);
          console.log("Assessment record created successfully:", assessment.id);
        } catch (assessmentError) {
          console.error("Critical error: Failed to create assessment record:", assessmentError);
          return res.status(500).json({ 
            message: "Failed to save assessment data. Please try again.",
            error: "ASSESSMENT_SAVE_FAILED"
          });
        }
      }

      // Determine subscription status based on choice and payment
      let subscriptionStatus = "free_trial";
      if (subscriptionChoice === "premium" && paymentIntentId) {
        subscriptionStatus = "active";
      } else if (subscriptionChoice === "premium") {
        subscriptionStatus = "pending"; // Premium requested but no payment confirmation
      } else if (subscriptionChoice === "promo") {
        subscriptionStatus = "active"; // Promo codes grant active status
      }

      // CRITICAL: Update user profile with assessment completion flag - this must succeed
      try {
        const updatedUser = await storage.updateUserProfile(userId, {
          assessmentCompleted: true,
          subscriptionStatus: subscriptionStatus,
          currentProgramId: programId,
          updatedAt: new Date()
        });

        console.log("User profile updated successfully:", {
          userId,
          assessmentCompleted: updatedUser?.assessmentCompleted,
          subscriptionStatus: updatedUser?.subscriptionStatus,
          currentProgramId: updatedUser?.currentProgramId
        });

        // Verify the update actually worked
        if (!updatedUser?.assessmentCompleted) {
          throw new Error("Assessment completion flag was not properly set");
        }

        // Double-check by fetching the user again to ensure database consistency
        const verificationUser = await storage.getUser(userId);
        if (!verificationUser?.assessmentCompleted) {
          console.error("VERIFICATION FAILED: Assessment completion not persisted in database");
          throw new Error("Database update verification failed");
        }

        console.log("Assessment completion verified in database:", {
          userId,
          assessmentCompleted: verificationUser.assessmentCompleted,
          subscriptionStatus: verificationUser.subscriptionStatus
        });

      } catch (profileError) {
        console.error("CRITICAL: Failed to update user profile with assessment completion:", profileError);
        return res.status(500).json({ 
          message: "Failed to mark assessment as complete. Please try again.",
          error: "PROFILE_UPDATE_FAILED"
        });
      }

      // Create or update initial progress tracking
      const existingProgress = await storage.getUserProgress(userId);
      if (!existingProgress) {
        try {
          // Get program details for accurate total workouts calculation
          const program = await storage.getProgram(programId);
          const totalWorkouts = program ? (program.duration || 12) * (program.frequency || 6) : 84;

          const newProgress = await storage.createUserProgress({
            userId,
            programId,
            currentWeek: 1,
            currentDay: 1,
            startDate: new Date().toISOString(),
            completedWorkouts: 0,
            totalWorkouts
          });
          console.log("Created initial progress tracking:", newProgress.id);
        } catch (progressError) {
          console.error("Failed to create progress tracking:", progressError);
          // Continue without progress tracking if it fails
        }
      } else {
        console.log("Progress tracking already exists for user");
        // Update existing progress with new program if different
        if (existingProgress.programId !== programId) {
          try {
            await storage.updateUserProgress(userId, {
              programId,
              currentWeek: 1,
              currentDay: 1,
              startDate: new Date().toISOString(),
              completedWorkouts: 0
            });
            console.log("Updated existing progress tracking with new program");
          } catch (updateError) {
            console.error("Failed to update existing progress:", updateError);
          }
        }
      }

      // Final verification of user status
      const verificationUser = await storage.getUser(userId);
      const finalStatus = {
        assessmentCompleted: verificationUser?.assessmentCompleted || false,
        subscriptionStatus: verificationUser?.subscriptionStatus || subscriptionStatus,
        currentProgramId: verificationUser?.currentProgramId || programId
      };

      console.log("Final user status verification:", finalStatus);

      // Ensure assessment was actually completed
      if (!finalStatus.assessmentCompleted) {
        console.error("VERIFICATION FAILED: Assessment completion flag not set properly");
        return res.status(500).json({ 
          message: "Assessment completion verification failed. Please contact support.",
          error: "VERIFICATION_FAILED"
        });
      }

      // Response with comprehensive status
      res.json({ 
        success: true, 
        userStatus: finalStatus,
        message: subscriptionChoice === "premium" ? 
          "Assessment completed with premium subscription" : 
          "Assessment completed with free trial access"
      });
    } catch (error) {
      console.error("Error completing assessment:", error);
      res.status(500).json({ 
        message: "Failed to complete assessment",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Mark assessment complete (for users who paid but don't have full assessment data)
  app.post('/api/mark-assessment-complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionChoice, paymentIntentId } = req.body;

      console.log("Marking assessment complete for user:", userId, "with choice:", subscriptionChoice);

      // Create a minimal assessment record to ensure database consistency
      try {
        const minimalAssessmentData = {
          userId,
          data: JSON.stringify({ 
            completed: true, 
            method: 'mark-complete-fallback',
            subscriptionChoice: subscriptionChoice,
            completedAt: new Date().toISOString()
          }),
          hyroxEventsCompleted: 0,
          generalFitnessYears: 1,
          primaryTrainingBackground: 'general',
          weeklyTrainingDays: 3,
          avgSessionLength: 60,
          competitionFormat: 'singles',
          age: 30,
          injuryHistory: false,
          injuryRecent: false,
          goals: 'general-fitness',
          equipmentAccess: 'full_gym',
          createdAt: new Date()
        };
        
        const assessment = await storage.createAssessment(minimalAssessmentData);
        console.log("Minimal assessment record created:", assessment.id);
      } catch (assessmentError) {
        console.error("Failed to create minimal assessment record:", assessmentError);
        // Log but don't fail - this is a fallback scenario
      }

      // Determine subscription status
      let subscriptionStatus = "free_trial";
      if (subscriptionChoice === "premium" && paymentIntentId) {
        subscriptionStatus = "active";
      } else if (subscriptionChoice === "premium") {
        subscriptionStatus = "pending";
      }

      // Update user profile to mark assessment as complete
      const updatedUser = await storage.updateUserProfile(userId, {
        assessmentCompleted: true,
        subscriptionStatus: subscriptionStatus,
        updatedAt: new Date()
      });

      console.log("User profile updated - assessment marked complete");

      // Assign a default program if user doesn't have one
      const user = await storage.getUser(userId);
      let assignedProgramId = user?.currentProgramId;

      if (!assignedProgramId) {
        console.log("Assigning default program to user");
        const programs = await storage.getPrograms();
        const defaultProgram = programs.find(p => p.difficulty === 'Intermediate') || 
                             programs.find(p => p.difficulty === 'Beginner') || 
                             programs[0];
        
        if (defaultProgram) {
          await storage.updateUserProgram(userId, defaultProgram.id);
          assignedProgramId = defaultProgram.id;
          
          // Create initial progress tracking
          const existingProgress = await storage.getUserProgress(userId);
          if (!existingProgress) {
            await storage.createUserProgress({
              userId,
              programId: defaultProgram.id,
              currentWeek: 1,
              currentDay: 1,
              startDate: new Date().toISOString(),
              completedWorkouts: 0,
              totalWorkouts: 84
            });
            console.log("Created progress tracking for default program:", defaultProgram.name);
          }
        } else {
          console.warn("No programs available to assign to user");
        }
      }

      res.json({ 
        success: true, 
        message: "Assessment marked complete",
        userStatus: {
          assessmentCompleted: true,
          subscriptionStatus: subscriptionStatus,
          currentProgramId: assignedProgramId
        }
      });
    } catch (error) {
      console.error("Error marking assessment complete:", error);
      res.status(500).json({ 
        message: "Failed to mark assessment complete",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Assessment routes
  app.post('/api/assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionChoice, paymentIntentId } = req.body;

      // If user chose premium but no payment confirmation, reject
      if (subscriptionChoice === "premium" && !paymentIntentId) {
        return res.status(400).json({ 
          message: "Payment confirmation required for premium subscription" 
        });
      }

      // Get available programs from database
      const programs = await storage.getPrograms();
      console.log("Available programs:", programs.map(p => ({ id: p.id, name: p.name, difficulty: p.difficulty, category: p.category })));

      // Convert database programs to metadata format for the new algorithm
      const { convertProgramToMetadata } = require('./programSelection');
      const programsWithMetadata = programs.map(program => ({
        program,
        metadata: convertProgramToMetadata(program)
      }));

      // Use new metadata-based program selection algorithm
      const programRecommendation = selectHyroxProgram(req.body, programsWithMetadata);

      console.log("Program recommendation:", {
        topProgram: programRecommendation.recommendedPrograms[0]?.program?.name,
        score: programRecommendation.recommendedPrograms[0]?.totalScore,
        userProfile: programRecommendation.userProfile,
        reasoning: programRecommendation.reasoningExplanation
      });

      const assessmentData = insertAssessmentSchema.parse({
        ...req.body,
        userId,
        data: JSON.stringify(req.body), // Store full assessment data
      });

      const assessment = await storage.createAssessment(assessmentData);

      // Get the top recommended program
      const topRecommendation = programRecommendation.recommendedPrograms[0];
      if (topRecommendation && topRecommendation.program) {
        const recommendedProgram = topRecommendation.program;

        await storage.updateUserProgram(userId, recommendedProgram.id);

        // Create user progress entry for the program
        const eventDate = req.body.eventDate ? new Date(req.body.eventDate) : null;
        await calculateProgramSchedule(userId, recommendedProgram.id, eventDate);

        // Create initial user progress tracking
        const existingProgress = await storage.getUserProgress(userId);
        if (!existingProgress) {
          await storage.createUserProgress({
            userId,
            programId: recommendedProgram.id,
            currentWeek: 1,
            currentDay: 1,
            startDate: new Date().toISOString(),
            eventDate: eventDate?.toISOString() || null,
            completedWorkouts: 0,
            totalWorkouts: recommendedProgram.duration ? recommendedProgram.duration * (recommendedProgram.frequency || 4) : 56
          });
        }

        console.log(`Successfully assigned ${recommendedProgram.name} (score: ${topRecommendation.totalScore.toFixed(2)}) to user ${userId}`);
      } else {
        console.error("No valid program recommendation found, using fallback");
        // Fallback to first available program
        if (programs.length > 0) {
          await storage.updateUserProgram(userId, programs[0].id);
        }
      }

      // Update user's fitness level based on program recommendation
      const fitnessLevel = programRecommendation.userProfile?.preferredDifficulty || 'Intermediate';
      await storage.updateUserAssessment(userId, fitnessLevel);

      // Update user profile with assessment data
      await storage.updateUserProfile(userId, {
        assessmentCompleted: true,
        hyroxEventDate: req.body.eventDate ? new Date(req.body.eventDate) : null,
        hyroxEventLocation: req.body.eventLocation || null,
        targetTime: req.body.bestFinishTime || null,
        fitnessLevel: fitnessLevel,
        updatedAt: new Date()
      });

      res.json({
        ...assessment,
        programRecommendation,
        recommendedProgram
      });
    } catch (error) {
      console.error("Error saving assessment:", error);
      res.status(500).json({ message: "Failed to save assessment" });
    }
  });

  // Weight tracking
  app.post('/api/weight', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weightData = insertWeightEntrySchema.parse({
        ...req.body,
        userId,
      });

      const entry = await storage.createWeightEntry(weightData);
      res.json(entry);
    } catch (error) {
      console.error("Error saving weight entry:", error);
      res.status(500).json({ message: "Failed to save weight entry" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Subscribe later - allows users to access app without subscription
  app.post('/api/subscribe-later', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUserSubscriptionStatus(userId, "subscribe_later");
      res.json({ message: "Subscription deferred successfully" });
    } catch (error: any) {
      console.error("Subscribe later error:", error);
      res.status(500).json({ message: "Error deferring subscription" });
    }
  });

  // Create £5/month subscription
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Creating subscription for user:", userId);

      // Check Stripe configuration
      if (!stripe) {
        console.error("Stripe not configured - missing STRIPE_SECRET_KEY");
        return res.status(500).json({ 
          message: "Payment processing not configured. Please contact support.",
          error: "STRIPE_NOT_CONFIGURED"
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        console.error("User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Check for existing active subscription
      if (user.stripeSubscriptionId) {
        try {
          const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (existingSubscription.status === 'active') {
            console.log("User already has active subscription:", existingSubscription.id);
            return res.json({
              subscriptionId: existingSubscription.id,
              status: 'active',
              message: "You already have an active subscription"
            });
          }
        } catch (stripeError) {
          console.log("Existing subscription not found, creating new one");
        }
      }

      // Ensure user has email
      if (!user.email) {
        console.error("User has no email:", userId);
        return res.status(400).json({ 
          message: 'Email address required for subscription. Please update your profile.',
          error: "NO_EMAIL"
        });
      }

      let customerId = user.stripeCustomerId;

      // Create or retrieve Stripe customer
      if (!customerId) {
        console.log("Creating new Stripe customer for user:", userId);
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, customerId, "");
      } else {
        // Verify the customer still exists in Stripe
        try {
          await stripe.customers.retrieve(customerId);
          console.log("Verified existing Stripe customer:", customerId);
        } catch (customerError) {
          console.log("Existing customer not found in Stripe, creating new one:", customerId);
          // Customer doesn't exist in Stripe, create a new one
          const customer = await stripe.customers.create({
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            metadata: { userId }
          });
          customerId = customer.id;
          await storage.updateUserStripeInfo(userId, customerId, "");
        }
      }

      console.log("Using Stripe customer:", customerId);

      // Create subscription with proper configuration for immediate payment collection
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: 'price_1RgOOZGKLIEfAkDGfqPezReg'
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        expand: ['latest_invoice.payment_intent']
      });

      console.log("Created subscription:", {
        id: subscription.id, 
        status: subscription.status,
        hasLatestInvoice: !!subscription.latest_invoice
      });

      // Update user with subscription ID
      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      // Extract payment intent client secret with improved error handling
      let clientSecret = null;
      
      console.log("Subscription created:", {
        id: subscription.id,
        status: subscription.status,
        hasLatestInvoice: !!subscription.latest_invoice
      });

      if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
        const invoice = subscription.latest_invoice;
        console.log("Invoice details:", {
          id: invoice.id,
          status: invoice.status,
          hasPaymentIntent: !!invoice.payment_intent,
          paymentIntentType: typeof invoice.payment_intent
        });
        
        if (invoice.payment_intent) {
          if (typeof invoice.payment_intent === 'object' && invoice.payment_intent.client_secret) {
            clientSecret = invoice.payment_intent.client_secret;
            console.log("Successfully extracted client secret from expanded payment intent");
          } else if (typeof invoice.payment_intent === 'string') {
            // Payment intent is just an ID, retrieve the full object
            try {
              console.log("Retrieving payment intent:", invoice.payment_intent);
              const fullPaymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
              clientSecret = fullPaymentIntent.client_secret;
              console.log("Successfully retrieved client secret from payment intent ID");
            } catch (retrieveError) {
              console.error("Failed to retrieve payment intent:", retrieveError);
            }
          }
        }
      }

      // If no client secret found, ensure the subscription has an invoice with payment intent
      if (!clientSecret) {
        console.log("No client secret found, creating invoice and payment intent");
        try {
          // Get the subscription again to check for invoice
          const refreshedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ['latest_invoice.payment_intent']
          });

          if (refreshedSubscription.latest_invoice && typeof refreshedSubscription.latest_invoice === 'object') {
            const invoice = refreshedSubscription.latest_invoice;
            
            if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
              clientSecret = invoice.payment_intent.client_secret;
              console.log("Found client secret after subscription refresh");
            } else {
              // Manually create payment intent for the invoice amount
              const paymentIntent = await stripe.paymentIntents.create({
                customer: customerId,
                amount: 500, // £5.00 in pence
                currency: 'gbp',
                metadata: {
                  subscription_id: subscription.id,
                  user_id: userId,
                  invoice_id: invoice.id
                },
                automatic_payment_methods: {
                  enabled: true
                }
              });
              
              clientSecret = paymentIntent.client_secret;
              console.log("Created manual payment intent for subscription");
            }
          }
        } catch (refreshError) {
          console.error("Failed to refresh subscription or create payment intent:", refreshError);
        }
      }

      if (!clientSecret) {
        console.error("Failed to create client secret for subscription:", subscription.id);
        console.error("Subscription details:", {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          latest_invoice: subscription.latest_invoice ? 'exists' : 'missing'
        });
        
        // Cancel the subscription since we can't process payment
        try {
          await stripe.subscriptions.cancel(subscription.id);
          console.log("Cancelled incomplete subscription:", subscription.id);
        } catch (cancelError) {
          console.error("Failed to cancel incomplete subscription:", cancelError);
        }
        
        return res.status(500).json({ 
          message: "Failed to initialize payment. Please try again.",
          error: "NO_CLIENT_SECRET",
          debug: {
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            hasInvoice: !!subscription.latest_invoice
          }
        });
      }

      const response = {
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
        paymentUrl: `/payment?client_secret=${encodeURIComponent(clientSecret)}&subscription_id=${encodeURIComponent(subscription.id)}`,
        success: true,
        message: "Subscription created successfully"
      };

      console.log("Subscription creation successful:", response.subscriptionId);
      console.log("Payment URL generated:", response.paymentUrl);
      res.json(response);
    } catch (error: any) {
      console.error("Subscription creation error:", error);

      let message = "Failed to create subscription. Please try again.";
      let errorCode = "SUBSCRIPTION_ERROR";

      if (error.type === 'StripeCardError') {
        message = "Card error: " + error.message;
        errorCode = "CARD_ERROR";
      } else if (error.type === 'StripeInvalidRequestError') {
        message = "Invalid request: " + error.message;
        errorCode = "INVALID_REQUEST";
      } else if (error.code === 'resource_missing') {
        message = "Stripe resource not found. Please try again.";
        errorCode = "RESOURCE_MISSING";
      }

      res.status(500).json({ 
        message,
        error: errorCode,
        details: error.message
      });
    }
  });

  // Profile routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = req.body;

      // Convert date string to Date object if provided
      if (profileData.hyroxEventDate) {
        profileData.hyroxEventDate = new Date(profileData.hyroxEventDate);
      }

      const user = await storage.updateUserProfile(userId, profileData);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put('/api/change-program', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.body;

      const user = await storage.updateUserProgram(userId, programId);
      res.json(user);
    } catch (error) {
      console.error("Error changing program:", error);
      res.status(500).json({ message: "Failed to change program" });
    }
  });

  // Calendar routes
  app.get('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.currentProgramId) {
        return res.json([]);
      }

      const workouts = await storage.getWorkoutsByProgram(user.currentProgramId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.get('/api/workout-completions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completions = await storage.getWorkoutCompletions(userId);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching workout completions:", error);
      res.status(500).json({ message: "Failed to fetch workout completions" });
    }
  });

  // Get workout completions with full workout details for calendar history
  app.get('/api/calendar-workout-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const completions = await storage.getWorkoutCompletions(userId);

      // Get workout details for each completion to preserve historical data
      const historicalCompletions = await Promise.all(
        completions.map(async (completion) => {
          const workout = await storage.getWorkout(completion.workoutId);
          return {
            ...completion,
            workoutName: workout?.name || 'Deleted Workout',
            workoutDescription: workout?.description || 'Workout no longer available',
            workoutDuration: workout?.estimatedDuration || 0,
            week: workout?.week || 0,
            day: workout?.day || 0,
            completedDate: completion.completedAt
          };
        })
      );

      res.json(historicalCompletions);
    } catch (error) {
      console.error("Error fetching calendar workout history:", error);
      res.status(500).json({ message: "Failed to fetch workout history" });
    }
  });

  // Generate random HYROX workout
  app.get('/api/generate-random-workout', isAuthenticated, async (req: any, res) => {
    try {
      const randomWorkout = generateRandomHyroxWorkout();
      res.json(randomWorkout);
    } catch (error) {
      console.error("Error generating random workout:", error);
      res.status(500).json({ message: "Failed to generate random workout" });
    }
  });

  // Get random workout (for workouts page)
  app.get('/api/random-workout', isAuthenticated, async (req: any, res) => {
    try {
      const randomWorkout = generateRandomHyroxWorkout();
      res.json(randomWorkout);
    } catch (error) {
      console.error("Error getting random workout:", error);
      res.status(500).json({ message: "Failed to get random workout" });
    }
  });

  // Complete random HYROX workout and log it
  app.post('/api/complete-random-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutData, duration, notes, rating } = req.body;

      // Create a temporary workout entry for the random workout
      const tempWorkout = await storage.createWorkout({
        programId: 0, // Special ID for random workouts
        name: workoutData.name,
        description: workoutData.description,
        week: 0,
        day: 0,
        estimatedDuration: workoutData.estimatedDuration,
        exercises: workoutData.exercises
      });

      // Record the completion
      await storage.createWorkoutCompletion({
        userId,
        workoutId: tempWorkout.id,
        duration: duration || workoutData.estimatedDuration,
        notes: notes || null,
        rating: rating || null,
        skipped: false,
        exerciseData: workoutData.exercises
      });

      // Update user progress (add to completed workouts count)
      const progress = await storage.getUserProgress(userId);
      if (progress) {
        await storage.updateUserProgress(userId, {
          completedWorkouts: (progress.completedWorkouts || 0) + 1,
          lastWorkoutDate: new Date().toISOString().split('T')[0] as any
        });
      }

      res.json({ 
        success: true, 
        message: "Random workout completed and logged successfully",
        workoutId: tempWorkout.id
      });
    } catch (error) {
      console.error("Error completing random workout:", error);
      res.status(500).json({ message: "Failed to complete random workout" });
    }
  });

  // Get available programs for selection
  app.get('/api/available-programs', async (req, res) => {
    try {
      const availablePrograms = Object.values(HYROX_PROGRAMS)
        .filter(p => p.id !== "MaintenanceProgram")
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description
        }));

      res.json(availablePrograms);
    } catch (error) {
      console.error("Error fetching available programs:", error);
      res.status(500).json({ message: "Failed to fetch available programs" });
    }
  });

  // Load complete workout programs from CSV data
  app.post('/api/load-programs', async (req, res) => {
    try {
      const programs = await loadProgramsFromCSV();
      res.json({ message: "Complete workout programs loaded successfully", count: programs.length });
    } catch (error) {
      console.error("Error loading programs:", error);
      res.status(500).json({ message: "Failed to load programs" });
    }
  });

  // Calculate program schedule based on event date
  app.post('/api/calculate-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId, eventDate } = req.body;

      const schedule = await calculateProgramSchedule(userId, programId, eventDate ? new Date(eventDate) : null);
      res.json(schedule);
    } catch (error) {
      console.error("Error calculating schedule:", error);
      res.status(500).json({ message: "Failed to calculate schedule" });
    }
  });

  // CSV/XLSX upload endpoint for programs
  app.post('/api/admin/upload-program', isAuthenticated, requireAdmin, upload.single('file'), async (req, res) => {
    try {
      const { name, description, difficulty, duration, frequency, category, racecategory } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse the file based on type
      let workbook;
      try {
        if (file.mimetype === 'text/csv' || file.originalname?.endsWith('.csv')) {
          const csvData = file.buffer.toString('utf8');
          workbook = XLSX.read(csvData, { type: 'string' });
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.originalname?.endsWith('.xlsx')) {
          workbook = XLSX.read(file.buffer, { type: 'buffer' });
        } else {
          return res.status(400).json({ message: "Unsupported file type. Please upload CSV or XLSX files." });
        }
      } catch (parseError) {
        console.error("File parsing error:", parseError);
        return res.status(400).json({ message: "Invalid file format. Please check your CSV/XLSX file." });
      }

      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({ message: "File is empty or has no valid data" });
      }

      // Create the program first
      const program = await storage.createProgram({
        name,
        description,
        difficulty,
        duration: parseInt(duration),
        frequency: parseInt(frequency),
        category,
        racecategory
      });

      // Process workout data
      const workouts = [];
      for (const row of jsonData) {
        const workout = row as any;

        // Validate required fields
        if (!workout.week || !workout.day || !workout.name) {
          console.warn("Skipping row with missing required fields:", workout);
          continue;
        }

        // Parse exercises - handle both JSON string and plain text
        let exercises = [];
        if (workout.exercises) {
          try {
            if (typeof workout.exercises === 'string') {
              // Try to parse as JSON first
              try {
                exercises = JSON.parse(workout.exercises);
              } catch {
                // If not JSON, treat as simple text description
                exercises = [{
                  name: workout.exercises,
                  type: "general",
                  description: workout.exercises
                }];
              }
            } else if (Array.isArray(workout.exercises)) {
              exercises = workout.exercises;
            }
          } catch (error) {
            console.warn("Error parsing exercises for workout:", workout.name, error);
            exercises = [{
              name: workout.exercises || "Workout",
              type: "general",
              description: workout.exercises || ""
            }];
          }
        }

        const workoutData = {
          programId: program.id,
          name: workout.name,
          description: workout.description || "",
          week: parseInt(workout.week) || 1,
          day: parseInt(workout.day) || 1,
          duration: parseInt(workout.duration) || 60,
          exercises: exercises
        };

        try {
          const createdWorkout = await storage.createWorkout(workoutData);
          workouts.push(createdWorkout);
        } catch (workoutError) {
          console.error("Error creating workout:", workoutData.name, workoutError);
        }
      }

      res.json({ 
        message: "Program uploaded successfully", 
        program, 
        workoutsCreated: workouts.length,
        totalRows: jsonData.length
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload program: " + (error as Error).message });
    }
  });

  // Seed Hyrox programs (dev only)
  app.post('/api/seed-programs', async (req, res) => {
    try {
      const programs = await seedHyroxPrograms();
      res.json({ message: "Hyrox programs seeded successfully", count: programs.length });
    } catch (error) {
      console.error("Error seeding programs:", error);
      res.status(500).json({ message: "Failed to seed programs" });
    }
  });

  // Subscription status endpoint
  app.get("/api/subscription-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Checking subscription status for user:", userId, {
        subscriptionStatus: user.subscriptionStatus,
        stripeSubscriptionId: user.stripeSubscriptionId,
        stripeCustomerId: user.stripeCustomerId
      });

      let subscriptionStatus = {
        isSubscribed: false,
        subscriptionStatus: 'inactive' as const,
        subscriptionId: user.stripeSubscriptionId,
        customerId: user.stripeCustomerId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
      };

      // First check database subscription status
      if (user.subscriptionStatus === 'active') {
        subscriptionStatus.isSubscribed = true;
        subscriptionStatus.subscriptionStatus = 'active';
        console.log("User has active subscription status in database");
      }

      // Check Stripe subscription status if user has a subscription ID
      if (user.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          console.log("Stripe subscription retrieved:", {
            id: subscription.id,
            status: subscription.status,
            customerId: subscription.customer
          });

          subscriptionStatus = {
            isSubscribed: subscription.status === 'active' || subscription.status === 'trialing',
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            customerId: subscription.customer as string,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          };

          // Update local database if Stripe status differs
          if (subscription.status !== user.subscriptionStatus) {
            console.log(`Updating user subscription status from ${user.subscriptionStatus} to ${subscription.status}`);
            await storage.updateUserProfile(userId, {
              subscriptionStatus: subscription.status,
              updatedAt: new Date()
            });
          }
        } catch (stripeError: any) {
          console.error("Error fetching subscription from Stripe:", stripeError.message);
          // If subscription or customer not found in Stripe, but user has active status in DB, keep active
          if (stripeError.code === 'resource_missing') {
            if (user.subscriptionStatus === 'active') {
              console.log("Stripe subscription not found but user marked as active - keeping active status");
              subscriptionStatus.isSubscribed = true;
              subscriptionStatus.subscriptionStatus = 'active';
            } else {
              console.log("Clearing invalid Stripe references for user:", userId);
              await storage.updateUserStripeInfo(userId, "", "");
            }
          }
        }
      } else if (user.subscriptionStatus === 'active') {
        // User marked as active but no Stripe subscription ID - trust database
        console.log("User marked as active without Stripe subscription ID");
        subscriptionStatus.isSubscribed = true;
        subscriptionStatus.subscriptionStatus = 'active';
      }

      console.log("Final subscription status:", subscriptionStatus);
      res.json(subscriptionStatus);
    } catch (error: any) {
      console.error("Subscription status error:", error);
      res.status(500).json({ message: "Error fetching subscription status" });
    }
  });

  // Create subscription endpoint
  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Create subscription request for user:", userId);
      
      const user = await storage.getUser(userId);
      console.log("User found:", user ? `${user.email} (ID: ${user.id})` : "No user found");

      if (!user) {
        console.error("User not found in database for ID:", userId);
        return res.status(404).json({ 
          message: "User not found. Please log in again.",
          error: "USER_NOT_FOUND"
        });
      }

      if (!user.email) {
        console.error("User has no email address:", userId);
        return res.status(400).json({ 
          message: "Email address required for subscription. Please update your profile.",
          error: "NO_EMAIL"
        });
      }

      if (!stripe) {
        console.error("Stripe not configured - missing STRIPE_SECRET_KEY");
        return res.status(500).json({ 
          message: "Payment processing not configured. Please contact support.",
          error: "STRIPE_NOT_CONFIGURED"
        });
      }

      // Validate price ID exists and test it
      const PRICE_ID = 'price_1RgOOZGKLIEfAkDGfqPezReg';
      if (!PRICE_ID) {
        console.error("Stripe price ID not configured");
        return res.status(500).json({ 
          message: "Subscription pricing not configured. Please contact support.",
          error: "PRICE_ID_NOT_CONFIGURED"
        });
      }

      // Verify price exists in Stripe and get details
      let priceDetails;
      try {
        priceDetails = await stripe.prices.retrieve(PRICE_ID);
        console.log("Price validation successful:", {
          id: priceDetails.id,
          amount: priceDetails.unit_amount,
          currency: priceDetails.currency,
          active: priceDetails.active
        });
        
        if (!priceDetails.active) {
          console.error("Price ID is not active in Stripe:", PRICE_ID);
          return res.status(500).json({ 
            message: "Subscription pricing is currently unavailable. Please contact support.",
            error: "PRICE_NOT_ACTIVE"
          });
        }
      } catch (priceError: any) {
        console.error("Price validation failed:", priceError.message);
        return res.status(500).json({ 
          message: "Subscription pricing configuration error. Please contact support.",
          error: "INVALID_PRICE_ID",
          details: priceError.message
        });
      }

      let customerId = user.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: { userId }
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, customerId, "");
      }

      // Check for existing active subscription
      if (user.stripeSubscriptionId) {
        try {
          const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (existingSubscription.status === 'active') {
            return res.json({
              subscriptionId: existingSubscription.id,
              status: existingSubscription.status,
              paymentUrl: '/subscription-success'
            });
          }
        } catch (error) {
          console.log("Existing subscription not found, creating new one");
        }
      }

      // Verify price exists in Stripe
      try {
        await stripe.prices.retrieve('price_1RgOOZGKLIEfAkDGfqPezReg');
      } catch (priceError) {
        console.error("Price ID not found in Stripe:", 'price_1RgOOZGKLIEfAkDGfqPezReg');
        return res.status(500).json({ 
          message: "Subscription pricing configuration error. Please contact support.",
          error: "INVALID_PRICE_ID"
        });
      }

      // Create new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: 'price_1RgOOZGKLIEfAkDGfqPezReg'
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      // Extract payment intent client secret safely
      const invoice = subscription.latest_invoice;
      let clientSecret = null;

      if (invoice && typeof invoice === 'object' && invoice.payment_intent) {
        if (typeof invoice.payment_intent === 'object' && invoice.payment_intent.client_secret) {
          clientSecret = invoice.payment_intent.client_secret;
        }
      }

      if (!clientSecret) {
        console.error("No payment intent client secret found for subscription:", subscription.id);
        return res.status(500).json({ 
          message: "Failed to create payment intent. Please try again.",
          error: "NO_CLIENT_SECRET"
        });
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
        paymentUrl: `/payment?client_secret=${clientSecret}&subscription_id=${subscription.id}`
      });
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Confirm subscription after successful payment
  app.post("/api/subscription-confirmed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionId, paymentIntentId } = req.body;
      
      console.log("Subscription confirmation:", { userId, subscriptionId, paymentIntentId });

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Verify payment intent or setup intent is successful
      let intentSucceeded = false;
      let intentDetails = null;
      
      try {
        if (paymentIntentId.startsWith('pi_')) {
          // Payment intent
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          intentSucceeded = paymentIntent.status === 'succeeded';
          intentDetails = { type: 'payment_intent', status: paymentIntent.status };
        } else if (paymentIntentId.startsWith('seti_')) {
          // Setup intent
          const setupIntent = await stripe.setupIntents.retrieve(paymentIntentId);
          intentSucceeded = setupIntent.status === 'succeeded';
          intentDetails = { type: 'setup_intent', status: setupIntent.status };
        }
      } catch (stripeError) {
        console.error("Error verifying payment intent:", stripeError);
        return res.status(400).json({ message: "Unable to verify payment status" });
      }
      
      if (!intentSucceeded) {
        console.error("Payment intent not successful:", intentDetails);
        return res.status(400).json({ message: "Payment/Setup not confirmed" });
      }

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log("Stripe subscription retrieved:", {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer
      });
      
      // Update user subscription status, assessment completion, and Stripe info
      const updateResult = await storage.updateUserProfile(userId, {
        subscriptionStatus: "active",
        assessmentCompleted: true,  // Ensure assessment is marked as completed
        updatedAt: new Date()
      });
      
      console.log("User profile updated:", updateResult ? "success" : "failed");
      
      // Update Stripe subscription info in user record
      await storage.updateUserStripeInfo(userId, subscription.customer as string, subscriptionId);

      // Verification - ensure updates were applied
      const updatedUser = await storage.getUser(userId);
      console.log("Post-payment verification:", {
        userId,
        assessmentCompleted: updatedUser?.assessmentCompleted,
        subscriptionStatus: updatedUser?.subscriptionStatus,
        stripeSubscriptionId: updatedUser?.stripeSubscriptionId
      });

      if (!updatedUser?.assessmentCompleted) {
        console.error("Assessment completion flag not set properly for user:", userId);
      }

      console.log("Subscription confirmed and assessment marked complete for user:", userId);
      
      res.json({
        success: true,
        message: "Subscription confirmed successfully",
        userStatus: {
          assessmentCompleted: updatedUser?.assessmentCompleted,
          subscriptionStatus: updatedUser?.subscriptionStatus
        }
      });
    } catch (error: any) {
      console.error("Subscription confirmation error:", error);
      res.status(500).json({ message: "Error confirming subscription: " + error.message });
    }
  });

  // Cancel subscription endpoint with immediate downgrade option
  app.post("/api/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { immediate = false } = req.body;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      let subscription;

      if (immediate) {
        // Cancel immediately and downgrade to free plan
        subscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);

        // Update user profile to free status immediately
        await storage.updateUserProfile(userId, {
          subscriptionStatus: "free_trial",
          updatedAt: new Date()
        });

        // Clear Stripe info from user record
        await storage.updateUserStripeInfo(userId, user.stripeCustomerId || "", "");

        res.json({
          success: true,
          message: "Subscription cancelled immediately. You now have free access.",
          subscription: {
            id: subscription.id,
            status: "canceled",
            cancelAtPeriodEnd: true,
            currentPeriodEnd: new Date().toISOString()
          }
        });
      } else {
        // Cancel at period end (existing behavior)
        subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true
        });

        res.json({
          success: true,
          message: "Subscription will be cancelled at the end of your billing period.",
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
          }
        });
      }
    } catch (error: any) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: "Error canceling subscription: " + error.message });
    }
  });

  // Downgrade to free plan endpoint
  app.post("/api/downgrade-to-free", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user has active Stripe subscription, cancel it immediately
      if (user.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log(`Cancelled Stripe subscription ${user.stripeSubscriptionId} for user ${userId}`);
        } catch (stripeError) {
          console.error("Error cancelling Stripe subscription:", stripeError);
          // Continue with downgrade even if Stripe cancellation fails
        }
      }

      // Update user to free plan status
      await storage.updateUserProfile(userId, {
        subscriptionStatus: "free_trial",
        updatedAt: new Date()
      });

      // Clear Stripe info
      await storage.updateUserStripeInfo(userId, user.stripeCustomerId || "", "");

      res.json({
        success: true,
        message: "Successfully downgraded to free plan. You still have access to basic features.",
        subscriptionStatus: "free_trial"
      });
    } catch (error: any) {
      console.error("Downgrade error:", error);
      res.status(500).json({ message: "Error downgrading to free plan: " + error.message });
    }
  });

  // Stripe webhook handler
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("Webhook received:", {
      signature: !!sig,
      webhookSecret: !!webhookSecret,
      bodySize: req.body?.length || 0
    });

    if (!stripe) {
      console.error("Stripe not configured for webhook processing");
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    if (!sig) {
      console.error("No stripe signature header found");
      return res.status(400).json({ error: 'No signature header' });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
      console.log("Webhook event constructed successfully:", event.type);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          const successfulInvoice = event.data.object;
          const successSubscriptionId = successfulInvoice.subscription;
          if (successSubscriptionId && typeof successSubscriptionId === 'string') {
            const user = await storage.getUserByStripeSubscriptionId(successSubscriptionId);
            if (user) {
              await storage.updateUserProfile(user.id, {
                subscriptionStatus: "active",
                updatedAt: new Date()
              });
              console.log(`Payment succeeded for user ${user.id}, subscription ${successSubscriptionId}`);
            } else {
              console.warn(`Payment succeeded but user not found for subscription ${successSubscriptionId}`);
            }
          }
          break;

      case 'invoice.upcoming':
        const upcomingInvoice = event.data.object;
        const upcomingSubscriptionId = upcomingInvoice.subscription;
        if (upcomingSubscriptionId) {
          const user = await storage.getUserByStripeSubscriptionId(upcomingSubscriptionId as string);
          if (user) {
            console.log(`Upcoming invoice for user ${user.id} - amount: ${upcomingInvoice.amount_due}`);
            // You could send email reminder here
          }
        }
        break;

      case 'invoice.payment_action_required':
        const actionRequiredInvoice = event.data.object;
        const actionSubscriptionId = actionRequiredInvoice.subscription;
        if (actionSubscriptionId) {
          const user = await storage.getUserByStripeSubscriptionId(actionSubscriptionId as string);
          if (user) {
            await storage.updateUserProfile(user.id, {
              subscriptionStatus: "incomplete",
              updatedAt: new Date()
            });
            console.log(`Payment action required for user ${user.id}`);
            // Send notification about authentication required
          }
        }
        break;

      case 'customer.subscription.trial_will_end':
        const trialEndSubscription = event.data.object;
        const trialUser = await storage.getUserByStripeSubscriptionId(trialEndSubscription.id);
        if (trialUser) {
          console.log(`Trial ending in 3 days for user ${trialUser.id}`);
          // Send trial ending notification
        }
        break;

      case 'payment_method.automatically_updated':
        const updatedPaymentMethod = event.data.object;
        console.log(`Payment method automatically updated: ${updatedPaymentMethod.id}`);
        // Could notify user about card update
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        const failedSubscriptionId = failedInvoice.subscription;
        if (failedSubscriptionId) {
          const user = await storage.getUserByStripeSubscriptionId(failedSubscriptionId as string);
          if (user) {
            console.log(`Payment failed for user ${user.id}. Attempt: ${failedInvoice.attempt_count}`);

            // Update user status to indicate payment issues
            await storage.updateUserProfile(user.id, {
              subscriptionStatus: "past_due",
              updatedAt: new Date()
            });

            // Store failed payment information for retry logic
            await storage.createFailedPaymentRecord({
              userId: user.id,
              invoiceId: failedInvoice.id,
              attemptCount: failedInvoice.attempt_count,
              amount: failedInvoice.amount_due,
              currency: failedInvoice.currency,
              failureReason: failedInvoice.last_finalization_error?.message || 'Payment failed',
              nextRetryAt: failedInvoice.next_payment_attempt ? new Date(failedInvoice.next_payment_attempt * 1000) : null,
              createdAt: new Date()
            });

            // Send notification (you would implement email service here)
            console.log(`Would send payment failure notification to user ${user.id} (${user.email})`);
          }
        }
        break;

      case 'invoice.finalization_failed':
        const finalizationFailedInvoice = event.data.object;
        console.log(`Invoice finalization failed: ${finalizationFailedInvoice.id}`);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        const deletedUser = await storage.getUserByStripeSubscriptionId(deletedSubscription.id);
        if (deletedUser) {
          await storage.updateUserProfile(deletedUser.id, {
            subscriptionStatus: "free_trial",
            updatedAt: new Date()
          });
          await storage.updateUserStripeInfo(deletedUser.id, deletedUser.stripeCustomerId || "", "");
          console.log(`Subscription deleted for user ${deletedUser.id}`);
        }
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        const updatedUser = await storage.getUserByStripeSubscriptionId(updatedSubscription.id);
        if (updatedUser) {
          let newStatus = "active";
          if (updatedSubscription.status === 'past_due') {
            newStatus = "past_due";
          } else if (updatedSubscription.status === 'canceled') {
            newStatus = "free_trial";
          } else if (updatedSubscription.status === 'unpaid') {
            newStatus = "past_due";
          }

          await storage.updateUserProfile(updatedUser.id, {
            subscriptionStatus: newStatus,
            updatedAt: new Date()
          });
          console.log(`Subscription updated for user ${updatedUser.id}: ${updatedSubscription.status}`);
        }
        break;

      case 'payment_method.attached':
        const attachedPaymentMethod = event.data.object;
        console.log(`Payment method attached: ${attachedPaymentMethod.id}`);
        break;

      default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (webhookError) {
      console.error(`Error processing webhook event ${event.type}:`, webhookError);
      // Still return success to Stripe to avoid retries for processing errors
      return res.json({received: true, error: 'processing_error'});
    }

    res.json({received: true});
  });

  // Resume subscription endpoint
  app.post("/api/resume-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No subscription found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false
      });

      res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }
      });
    } catch (error: any) {
      console.error("Subscription resume error:", error);
      res.status(500).json({ message: "Error resuming subscription: " + error.message });
    }
  });

  // Update payment method endpoint
  app.post("/api/update-payment-method", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "No customer found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Create a setup intent for updating payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      res.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    } catch (error: any) {
      console.error("Payment method update error:", error);
      res.status(500).json({ message: "Error updating payment method: " + error.message });
    }
  });

  // Confirm payment method update
  app.post("/api/confirm-payment-method-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { setupIntentId, paymentMethodId } = req.body;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "Customer or subscription not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Verify setup intent succeeded
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment method setup failed" });
      }

      // Update the subscription's default payment method
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        default_payment_method: paymentMethodId
      });

      // Set as customer's default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      res.json({
        success: true,
        message: "Payment method updated successfully"
      });
    } catch (error: any) {
      console.error("Payment method confirmation error:", error);
      res.status(500).json({ message: "Error confirming payment method: " + error.message });
    }
  });

  // Get customer's payment methods
  app.get("/api/payment-methods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.json({ paymentMethods: [] });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      // Get customer's default payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      const defaultPaymentMethodId = typeof customer !== 'string' 
        ? customer.invoice_settings?.default_payment_method 
        : null;

      const formattedPaymentMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId
      }));

      res.json({ paymentMethods: formattedPaymentMethods });
    } catch (error: any) {
      console.error("Payment methods fetch error:", error);
      res.status(500).json({ message: "Error fetching payment methods: " + error.message });
    }
  });

  // Delete payment method
  app.delete("/api/payment-methods/:paymentMethodId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentMethodId } = req.params;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Detach the payment method
      await stripe.paymentMethods.detach(paymentMethodId);

      res.json({
        success: true,
        message: "Payment method removed successfully"
      });
    } catch (error: any) {
      console.error("Payment method deletion error:", error);
      res.status(500).json({ message: "Error removing payment method: " + error.message });
    }
  });

  // Retry failed payment
  app.post("/api/retry-payment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paymentMethodId } = req.body;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Get the latest invoice
      const invoices = await stripe.invoices.list({
        subscription: user.stripeSubscriptionId,
        limit: 1
      });

      if (invoices.data.length === 0) {
        return res.status(404).json({ message: "No invoice found" });
      }

      const invoice = invoices.data[0];

      if (invoice.status === 'paid') {
        return res.status(400).json({ message: "Invoice is already paid" });
      }

      // Update payment method if provided
      if (paymentMethodId) {
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          default_payment_method: paymentMethodId
        });
      }

      // Retry the payment
      const paidInvoice = await stripe.invoices.pay(invoice.id);

      if (paidInvoice.status === 'paid') {
        // Update user subscription status if payment succeeded
        await storage.updateUserProfile(userId, {
          subscriptionStatus: "active",
          updatedAt: new Date()
        });

        res.json({
          success: true,
          message: "Payment retry successful"
        });
      } else {
        res.json({
          success: false,
          message: "Payment retry failed",
          invoiceStatus: paidInvoice.status
        });
      }
    } catch (error: any) {
      console.error("Payment retry error:", error);
      res.status(500).json({ message: "Error retrying payment: " + error.message });
    }
  });

  // Stripe payment integration
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, currency = "usd" } = req.body;
      const userId = req.user.claims.sub;

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: { userId }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Phase transition management
  app.post("/api/check-phase-transition", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const programPhaseManager = await import('./programPhaseManager');
      const { checkForPhaseTransition, transitionUserToPhase } = programPhaseManager;

      const transitionCheck = await checkForPhaseTransition(userId);

      if (transitionCheck.shouldTransition && transitionCheck.newPhase) {
        await transitionUserToPhase(userId, transitionCheck.newPhase);
        res.json({ 
          transitioned: true, 
          newPhase: transitionCheck.newPhase 
        });
      } else {
        res.json({ transitioned: false });
      }
    } catch (error: any) {
      console.error("Phase transition error:", error);
      res.status(500).json({ message: "Error checking phase transition" });
    }
  });

  // Admin management routes
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Admin users fetch error:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  app.patch("/api/admin/users/:targetUserId", isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);

      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { targetUserId } = req.params;
      const { isAdmin } = req.body;

      const updatedUser = await storage.updateUserAdmin(targetUserId, { isAdmin });
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Admin user update error:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Check for missed workouts based on date logic
  app.post("/api/check-missed-workouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);

      if (!progress || !progress.startDate) {
        return res.json({ missedWorkouts: [] });
      }

      const today = new Date();
      const startDate = new Date(progress.startDate);
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate what week/day we should be on based on calendar days
      const expectedWeek = Math.floor(daysSinceStart / 7) + 1;
      const expectedDay = (daysSinceStart % 7) + 1;

      const currentWeek = progress.currentWeek || 1;
      const currentDay = progress.currentDay || 1;

      // If we're behind schedule, mark missed workouts
      const missedWorkouts = [];

      if (expectedWeek > currentWeek || (expectedWeek === currentWeek && expectedDay > currentDay)) {
        // We're behind - calculate missed workouts
        let checkWeek = currentWeek;
        let checkDay = currentDay;

        while (checkWeek < expectedWeek || (checkWeek === expectedWeek && checkDay < expectedDay)) {
          // Find workout for this missed day
          const [missedWorkout] = await db
            .select()
            .from(workouts)
            .where(
              and(
                eq(workouts.programId, progress.programId),
                eq(workouts.week, checkWeek),
                eq(workouts.day, checkDay)
              )
            );

          if (missedWorkout) {
            missedWorkouts.push({
              workout: missedWorkout,
              missedDate: new Date(startDate.getTime() + ((checkWeek - 1) * 7 + (checkDay - 1)) * 24 * 60 * 60 * 1000),
              week: checkWeek,
              day: checkDay
            });
          }

          checkDay++;
          if (checkDay > 7) {
            checkDay = 1;
            checkWeek++;
          }
        }
      }

      res.json({ 
        missedWorkouts,
        expectedWeek,
        expectedDay,
        currentWeek,
        currentDay,
        daysSinceStart
      });
    } catch (error: any) {
      console.error("Error checking missed workouts:", error);
      res.status(500).json({ message: "Failed to check missed workouts" });
    }
  });

  // Workout completion with progression logic
  app.post("/api/workout-completions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, rating, notes, skipped = false, duration } = req.body;

      console.log("Workout completion request:", { userId, workoutId, rating, notes, skipped, duration });

      // Validate required fields
      if (!workoutId) {
        return res.status(400).json({ message: "Workout ID is required" });
      }

      const parsedWorkoutId = parseInt(workoutId);
      if (isNaN(parsedWorkoutId)) {
        return res.status(400).json({ message: "Valid workout ID must be a number" });
      }

      // Validate optional fields
      if (rating !== null && rating !== undefined && (isNaN(rating) || rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      if (duration !== null && duration !== undefined && (isNaN(duration) || duration < 0)) {
        return res.status(400).json({ message: "Duration must be a positive number" });
      }

      // Validate user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("User not found:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Verify workout exists
      const workout = await storage.getWorkout(parsedWorkoutId);
      if (!workout) {
        console.error("Workout not found:", workoutId);
        return res.status(404).json({ message: "Workout not found" });
      }

      // Get current progress to determine next day
      let progress = await storage.getUserProgress(userId);
      if (!progress) {
        console.error("User progress not found for user:", userId);
        // Create initial progress if it doesn't exist
        progress = await storage.createUserProgress({
          userId,
          programId: workout.programId,
          currentWeek: 1,
          currentDay: 1,
          startDate: new Date().toISOString(),
          completedWorkouts: 0,
          totalWorkouts: 84 // Default for 12-week program
        });
        console.log("Created initial progress for user:", userId);
      }

      // Create workout completion record
      const completion = await storage.createWorkoutCompletion({
        userId,
        workoutId: parseInt(workoutId),
        rating: rating || null,
        notes: notes || null,
        skipped,
        duration: duration || null,
        completedAt: new Date()
      });

      console.log("Created workout completion:", completion.id);

      // Get all workouts for this program to understand progression
      const allWorkouts = await db
        .select()
        .from(workouts)
        .where(eq(workouts.programId, progress.programId))
        .orderBy(asc(workouts.week), asc(workouts.day));

      console.log(`Program has ${allWorkouts.length} total workouts`);

      // Get current position
      const currentDay = progress.currentDay || 1;
      const currentWeek = progress.currentWeek || 1;
      
      console.log(`Current position: Week ${currentWeek}, Day ${currentDay}`);

      // Find what the next workout should be
      let nextDay = currentDay + 1;
      let nextWeek = currentWeek;

      // Get the maximum day number in the current week
      const currentWeekWorkouts = allWorkouts.filter(w => w.week === currentWeek);
      const maxDayInCurrentWeek = Math.max(...currentWeekWorkouts.map(w => w.day));
      
      console.log(`Max day in current week ${currentWeek}: ${maxDayInCurrentWeek}`);

      // If we've completed the last day of the current week, move to next week
      if (nextDay > maxDayInCurrentWeek) {
        nextDay = 1;
        nextWeek = currentWeek + 1;
        
        // Check if the next week exists, if not find the next available week
        const nextWeekWorkouts = allWorkouts.filter(w => w.week === nextWeek);
        if (nextWeekWorkouts.length === 0) {
          // Find the next available week
          const availableWeeks = [...new Set(allWorkouts.map(w => w.week))].sort((a, b) => a - b);
          const currentWeekIndex = availableWeeks.indexOf(currentWeek);
          
          if (currentWeekIndex >= 0 && currentWeekIndex < availableWeeks.length - 1) {
            nextWeek = availableWeeks[currentWeekIndex + 1];
            nextDay = 1;
          } else {
            // End of program, cycle back to beginning
            nextWeek = availableWeeks[0];
            nextDay = 1;
          }
        }
      }

      // Verify the next workout exists
      const nextWorkout = allWorkouts.find(w => w.week === nextWeek && w.day === nextDay);
      
      if (!nextWorkout && allWorkouts.length > 0) {
        console.log(`Next workout Week ${nextWeek} Day ${nextDay} doesn't exist. Finding next available workout...`);

        // Find the next workout in chronological order after current position
        const nextAvailableWorkout = allWorkouts.find(w => 
          w.week > currentWeek || (w.week === currentWeek && w.day > currentDay)
        );

        if (nextAvailableWorkout) {
          nextWeek = nextAvailableWorkout.week;
          nextDay = nextAvailableWorkout.day;
          console.log(`Found next available workout: Week ${nextWeek} Day ${nextDay}`);
        } else {
          // If no next workout found, cycle back to the beginning
          const firstWorkout = allWorkouts[0];
          if (firstWorkout) {
            nextWeek = firstWorkout.week;
            nextDay = firstWorkout.day;
            console.log(`End of program reached, cycling back to Week ${nextWeek} Day ${nextDay}`);
          }
        }
      }

      // Update user progress with next day/week
      console.log(`Progressing user ${userId} from Week ${currentWeek} Day ${currentDay} to Week ${nextWeek} Day ${nextDay}`);

      const updatedProgress = await storage.updateUserProgress(userId, {
        currentDay: nextDay,
        currentWeek: nextWeek,
        completedWorkouts: skipped ? progress.completedWorkouts : (progress.completedWorkouts || 0) + 1,
        lastWorkoutDate: new Date().toISOString().split('T')[0] as any,
      });

      // Update user's total workout count and streak (only if not skipped)
      if (!skipped) {
        const currentUser = await storage.getUser(userId);
        if (currentUser) {
          await storage.updateUserProfile(userId, {
            totalWorkouts: (currentUser.totalWorkouts || 0) + 1,
            streak: (currentUser.streak || 0) + 1
          });
        }
      }

      res.json({
        completion,
        progress: updatedProgress,
        nextDay,
        nextWeek,
        message: skipped ? "Workout skipped - moved to next day" : "Workout completed - moved to next day"
      });
    } catch (error: any) {
      console.error("Error completing workout:", error);
      res.status(500).json({ message: "Failed to complete workout" });
    }
  });

  // Weight tracking system
  app.get("/api/weight-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getUserWeightEntries(userId);
      res.json(entries);
    } catch (error: any) {
      console.error("Weight entries fetch error:", error);
      res.status(500).json({ message: "Error fetching weight entries" });
    }
  });

  app.post("/api/weight-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weight, recordedAt, notes } = req.body;

      const entry = await storage.createWeightEntry({
        userId,
        weight,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        notes
      });

      res.json(entry);
    } catch (error: any) {
      console.error("Weight entry creation error:", error);
      res.status(500).json({ message: "Error creating weight entry" });
    }
  });

  // Admin routes for program management
  app.get('/api/admin/programs', requireAdmin, async (req: any, res) => {
    try {
      const programs = await storage.getPrograms();
      const programsWithWorkoutCounts = await Promise.all(
        programs.map(async (program) => {
          const workouts = await storage.getWorkoutsByProgram(program.id);
          return { 
            ...program, 
            workoutCount: workouts.length
          };
        })
      );
      res.json(programsWithWorkoutCounts);
    } catch (error) {
      console.error("Error fetching admin programs:", error);
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.post('/api/admin/programs', requireAdmin, async (req: any, res) => {
    try {
      const programData = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(programData);
      res.json(program);
    } catch (error) {
      console.error("Error creating program:", error);
      res.status(500).json({ message: "Failed to create program" });
        }
  });

  app.put('/api/admin/programs/:id', requireAdmin, async (req: any, res) => {
    try {
      const programId = parseInt(req.params.id);
      const updateData = req.body;
      const program = await storage.updateProgram(programId, updateData);
      res.json(program);
    } catch (error) {
      console.error("Error updating program:", error);
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  app.delete('/api/admin/programs/:id', requireAdmin, async (req: any, res) => {
    try {
      const programId = parseInt(req.params.id);
      await storage.deleteProgram(programId);
      res.json({ message: "Program deleted successfully" });
    } catch (error) {
      console.error("Error deleting program:", error);
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  app.post('/api/admin/programs/:id/workouts', requireAdmin, async (req: any, res) => {
    try {
      const programId = parseInt(req.params.id);
      const workoutData = { ...req.body, programId };
      const workout = await storage.createWorkout(workoutData);
      res.json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  app.put('/api/admin/workouts/:id', requireAdmin, async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      if (isNaN(workoutId)) {
        return res.status(400).json({ message: "Invalid workout ID" });
      }

      const rawUpdateData = req.body;
      console.log("Route: Received workout update data:", rawUpdateData);

      // Clean and validate the update data
      const updateData: any = {};

      // Only include valid workout fields
      const validFields = ['name', 'description', 'week', 'day', 'duration', 'workoutType', 'exercises', 'estimatedDuration'];

      for (const field of validFields) {
        if (rawUpdateData[field] !== undefined) {
          updateData[field] = rawUpdateData[field];
        }
      }

      // Handle numeric fields
      if (updateData.week !== undefined) {
        updateData.week = parseInt(updateData.week) || 1;
      }
      if (updateData.day !== undefined) {
        updateData.day = parseInt(updateData.day) || 1;
      }
      if (updateData.duration !== undefined) {
        updateData.duration = parseInt(updateData.duration) || 60;
      }
      if (updateData.estimatedDuration !== undefined) {
        updateData.estimatedDuration = parseInt(updateData.estimatedDuration) || updateData.duration || 60;
      }

      // Handle exercises field - ensure it's properly formatted
      if (updateData.exercises !== undefined) {
        if (typeof updateData.exercises === 'string') {
          try {
            // Try to parse the JSON string to validate it
            const parsed = JSON.parse(updateData.exercises);
            updateData.exercises = parsed; // Keep as parsed object for storage layer
          } catch (error) {
            console.error("Invalid exercises JSON string:", error);
            return res.status(400).json({ message: "Invalid exercises JSON format" });
          }
        }
        // If it's already an array/object, keep it as is
      }

      console.log("Route: Cleaned update data:", updateData);

      const workout = await storage.updateWorkout(workoutId, updateData);

      console.log("Route: Successfully updated workout:", workout?.id);
      res.json(workout);
    } catch (error) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: "Failed to update workout: " + (error instanceof Error ? error.message : "Unknown error") });
    }
  });

  app.delete('/api/admin/workouts/:id', requireAdmin, async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      if (isNaN(workoutId)) {
        return res.status(400).json({ message: "Invalid workout ID" });
      }

      await storage.deleteWorkout(workoutId);
      res.json({ message: "Workout deleted successfully" });
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });

  app.post('/api/admin/users/:id/admin', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { isAdmin } = req.body;
      const user = await storage.updateUserAdmin(userId, isAdmin);
      res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ message: "Failed to update user admin status" });
    }
  });

  // Admin: Upload program from CSV
  app.post('/api/admin/upload-program', isAuthenticated, requireAdmin, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const programData = {
        name: req.body.name,
        description: req.body.description,
        difficulty: req.body.difficulty,
        category: req.body.category,
        duration: parseInt(req.body.duration) || 12,
        frequency: parseInt(req.body.frequency) || 4
      };

      const { handleCSVUpload } = await import('./csvUploadHandler');
      const result = await handleCSVUpload(req.file.buffer, req.file.originalname, programData);

      res.json({ 
        message: `Program created successfully with ${result.workoutCount} workouts`,
        programId: result.programId,
        workoutCount: result.workoutCount
      });
    } catch (error) {
      console.error("Error uploading program:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upload program" });
    }
  });

  // Share workout to Strava with image
  // Strava connection status
  app.get('/api/strava/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      res.json({
        connected: user?.stravaConnected || false,
        athleteId: user?.stravaUserId || null
      });
    } catch (error) {
      console.error("Error getting Strava status:", error);
      res.status(500).json({ message: "Failed to get Strava status" });
    }
  });

  // Connect to Strava - initiate OAuth flow
  app.post('/api/strava/connect', isAuthenticated, async (req: any, res) => {
    try {
      const authUrl = StravaService.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating Strava connection:", error);
      res.status(500).json({ message: "Failed to initiate Strava connection" });
    }
  });

  // Get Strava connection URL
  app.get('/api/strava/connect', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
        return res.json({ 
          configured: false,
          message: "Strava integration not configured" 
        });
      }

      const authUrl = StravaService.getAuthorizationUrl();
      res.json({ authUrl, configured: true });
    } catch (error) {
      console.error("Error getting Strava connection:", error);
      res.status(500).json({ message: "Failed to get Strava connection" });
    }
  });

  // Push workout to Strava (alternative endpoint name)
  app.post('/api/strava/push-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, duration, notes } = req.body;

      console.log("Strava push-workout request:", { userId, workoutId, duration, notes });

      // Get user's Strava connection status
      const user = await storage.getUser(userId);
      if (!user?.stravaConnected || !user.stravaAccessToken) {
        return res.status(400).json({ 
          message: "Please connect your Strava account first",
          needsAuth: true 
        });
      }

      // Get workout details
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      // Generate workout image
      let imageBuffer;
      try {
        const { StravaImageService } = await import('./stravaImageService');
        imageBuffer = await StravaImageService.generateWorkoutImage(
          workout.name, 
          workout.exercises as any[]
        );
        console.log("Generated workout image, size:", imageBuffer?.length || 0, "bytes");
      } catch (imageError) {
        console.error('Image generation failed:', imageError);
        // Continue without image if generation fails
      }

      // Prepare workout data for Strava
      const workoutData = {
        name: workout.name,
        description: notes || `HybridX Training Session\n\n${workout.description || ''}`,
        duration: duration || 3600, // Default to 1 hour if not provided
        type: 'workout' as const,
        start_date_local: new Date().toISOString()
      };

      console.log("Pushing workout to Strava:", workoutData);

      // Push to Strava
      const result = await StravaService.pushWorkoutToStrava(
        userId, 
        workoutData, 
        imageBuffer
      );

      console.log("Strava push result:", result);

      if (result.success) {
        res.json({ 
          success: true, 
          message: result.warning || "Workout shared to Strava successfully!",
          activityId: result.activityId 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to share workout to Strava" 
        });
      }
    } catch (error: any) {
      console.error("Error pushing workout to Strava:", error);

      // Handle different types of Strava errors
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          message: "Strava authentication expired. Please reconnect your account.",
          needsAuth: true 
        });
      } else if (error.response?.status === 403) {
        return res.status(403).json({ 
          message: "Access denied. Please check your Strava permissions.",
          needsAuth: true 
        });
      } else if (error.response?.status === 422) {
        return res.status(422).json({ 
          message: "Invalid workout data for Strava: " + (error.response.data?.message || error.message)
        });
      }

      res.status(500).json({ 
        message: error.message || "Failed to share workout to Strava" 
      });
    }
  });

  // Strava OAuth callback
  app.get('/api/strava/callback', async (req, res) => {
    try {
      const { code, error, state } = req.query;

      if (error) {
        console.error('Strava OAuth error:', error);
        return res.redirect('/profile?strava_error=access_denied');
      }

      if (!code) {
        console.error('No authorization code received from Strava');
        return res.redirect('/profile?strava_error=no_code');
      }

      // Exchange code for tokens
      const tokens = await StravaService.exchangeCodeForTokens(code as string);
      console.log('Received Strava tokens for athlete:', tokens.athlete.id);

      // For now, we'll store the userId in a simple way
      // In production, you'd want to use the state parameter to maintain user session
      // This is a simplified approach - you might need to adjust based on your auth flow

      // Since we don't have the user session in this callback, we'll need to handle this differently
      // Let's redirect to a page that can handle the token exchange
      const tokenData = encodeURIComponent(JSON.stringify(tokens));
      res.redirect(`/profile?strava_tokens=${tokenData}`);

    } catch (error) {
      console.error('Strava callback error:', error);
      res.redirect('/profile?strava_error=callback_failed');
    }
  });

  // Save Strava tokens (called from frontend after callback)
  app.post('/api/strava/save-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tokens } = req.body;

      if (!tokens || !tokens.access_token) {
        return res.status(400).json({ message: "Invalid tokens provided" });
      }

      // Update user with Strava tokens
      await storage.updateUser(userId, {
        stravaUserId: tokens.athlete.id.toString(),
        stravaAccessToken: tokens.access_token,
        stravaRefreshToken: tokens.refresh_token,
        stravaTokenExpiry: new Date(tokens.expires_at * 1000),
        stravaConnected: true,
      });

      res.json({ 
        success: true,
        message: "Strava account connected successfully!"
      });
    } catch (error) {
      console.error("Error saving Strava tokens:", error);
      res.status(500).json({ message: "Failed to save Strava tokens" });
    }
  });

  // Disconnect Strava
  app.post('/api/strava/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await StravaService.disconnectStrava(userId);
      res.json({ success: true, message: "Strava account disconnected" });
    } catch (error) {
      console.error("Error disconnecting Strava:", error);
      res.status(500).json({ message: "Failed to disconnect Strava" });
    }
  });

  // Share workout to Strava with image
  app.post('/api/share-to-strava', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, duration, notes } = req.body;

      console.log("Strava share request:", { userId, workoutId, duration, notes });

      // Validate request data
      if (!workoutId) {
        return res.status(400).json({ message: "Workout ID is required" });
      }

      // Get user's Strava connection status
      const user = await storage.getUser(userId);
      if (!user?.stravaConnected || !user.stravaAccessToken) {
        return res.status(400).json({ 
          message: "Please connect your Strava account first",
          needsAuth: true 
        });
      }

      // Get workout details
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      // Generate workout image
      let imageBuffer;
      try {
        const { StravaImageService } = await import('./stravaImageService');
        imageBuffer = await StravaImageService.generateWorkoutImage(
          workout.name, 
          workout.exercises as any[]
        );
        console.log("Generated workout image, size:", imageBuffer?.length || 0, "bytes");
      } catch (imageError) {
        console.error('Image generation failed:', imageError);
        // Continue without image if generation fails
      }

      // Prepare workout data for Strava
      const workoutData = {
        name: workout.name,
        description: notes || `HybridX Training Session\n\n${workout.description || ''}`,
        duration: duration || (workout.estimatedDuration || 60) * 60,
        type: 'workout' as const,
        start_date_local: new Date().toISOString()
      };

      console.log("Pushing workout to Strava:", workoutData);

      // Push to Strava
      const result = await StravaService.pushWorkoutToStrava(
        userId, 
        workoutData, 
        imageBuffer
      );

      console.log("Strava push result:", result);

      if (result.success) {
        res.json({ 
          success: true, 
          message: result.warning || "Workout shared to Strava successfully!",
          activityId: result.activityId 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to share workout to Strava" 
        });
      }
    } catch (error: any) {
      console.error("Error sharing to Strava:", error);

      // Handle different types of Strava errors
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          message: "Strava authentication expired. Please reconnect your account.",
          needsAuth: true 
        });
      } else if (error.response?.status === 403) {
        return res.status(403).json({ 
          message: "Access denied. Please check your Strava permissions.",
          needsAuth: true 
        });
      } else if (error.response?.status === 422) {
        return res.status(422).json({ 
          message: "Invalid workout data for Strava: " + (error.response.data?.message || error.message)
        });
      }

      res.status(500).json({ 
        message: error.message || "Failed to share workout to Strava" 
      });
    }
  });

  // Domain verification endpoint
  app.get('/api/domain-info', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const currentDomain = `${protocol}://${host}`;

    res.json({
      currentDomain,
      stravaCallbackUrl: `${currentDomain}/api/strava/callback`,
      configuredCallbackUrl: `https://0fcc3a45-589d-49fb-a059-7d9954da233f-00-8sst6tp6qylm.spock.replit.dev/api/strava/callback`,
      match: `${currentDomain}/api/strava/callback` === `https://0fcc3a45-589d-49fb-a059-7d9954da233f-00-8sst6tp6qylm.spock.replit.dev/api/strava/callback`
    });
  });

  // Get workouts for a specific program (admin)
  app.get("/api/admin/programs/:id/workouts", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      console.log("Fetching workouts for program ID:", programId);

      const programWorkouts = await db.query.workouts.findMany({
        where: eq(workouts.programId, programId),
        orderBy: [asc(workouts.week), asc(workouts.day)]
      });

      console.log(`Found ${programWorkouts.length} workouts for program ${programId}`);

      // Transform the workouts to ensure all fields are properly formatted
      const transformedWorkouts = programWorkouts.map(workout => ({
        id: workout.id,
        programId: workout.programId,
        week: workout.week,
        day: workout.day,
        name: workout.name,
        description: workout.description,
        duration: workout.duration || workout.estimatedDuration || 60,
        exercises: workout.exercises || [],
        difficulty: workout.difficulty,
        workoutType: workout.workoutType || "Training",
        isCompleted: workout.isCompleted || false
      }));

      res.json(transformedWorkouts);
    } catch (error) {
      console.error("Error fetching program workouts:", error);
      res.status(500).json({ message: "Failed to fetch program workouts" });
    }
  });

  // Test Stripe integration (admin only)
  app.post('/api/stripe/test', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const PRICE_ID = 'price_1RgOOZGKLIEfAkDGfqPezReg';
      
      // Test creating a customer (won't be saved)
      const testCustomer = await stripe.customers.create({
        email: 'test@example.com',
        metadata: { test: 'true' }
      });

      // Test retrieving the price
      const price = await stripe.prices.retrieve(PRICE_ID);

      // Test creating a checkout session (won't be completed)
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: testCustomer.id,
        line_items: [{
          price: PRICE_ID,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

      // Clean up test customer
      await stripe.customers.del(testCustomer.id);

      res.json({
        success: true,
        message: "All Stripe operations successful",
        tests: {
          customerCreation: !!testCustomer.id,
          priceRetrieval: !!price.id,
          checkoutSession: !!checkoutSession.id,
          priceDetails: {
            amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring?.interval
          }
        }
      });
    } catch (error: any) {
      console.error("Stripe test error:", error);
      res.status(500).json({
        success: false,
        message: "Stripe test failed",
        error: error.message,
        code: error.code
      });
    }
  });

  // ============= REFERRAL SYSTEM ROUTES =============

  // Get user's referral stats and code
  app.get("/api/referral/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await getUserReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // Generate or get user's referral code
  app.post("/api/referral/generate-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user already has a referral code, return it
      if (user.referralCode) {
        const referralUrl = createReferralUrl(user.referralCode);
        return res.json({ 
          referralCode: user.referralCode,
          referralUrl 
        });
      }

      // Generate new referral code
      const referralCode = await generateReferralCode();

      // Update user with the new referral code
      user = await storage.updateUser(userId, { referralCode });

      const referralUrl = createReferralUrl(referralCode);

      res.json({ 
        referralCode,
        referralUrl 
      });
    } catch (error) {
      console.error("Error generating referral code:", error);
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  // Track referral when someone signs up with a referral code
  app.post("/api/referral/track", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referralCode } = req.body;

      if (!referralCode) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      await trackReferral(referralCode, userId);
      res.json({ message: "Referral tracked successfully" });
    } catch (error: any) {
      console.error("Error tracking referral:", error);
      res.status(400).json({ message: error.message || "Failed to track referral" });
    }
  });

  // Webhook endpoint for Stripe subscription updates
  app.post("/api/webhook/subscription", async (req, res) => {
    try {
      const { userId, monthsPaid, subscriptionStatus } = req.body;

      if (!userId || monthsPaid === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Update subscription in our database
      let subscription = await storage.getUserSubscription(userId);

      if (!subscription) {
        // Create new subscription record
        subscription = await storage.createSubscription({
          userId,
          status: subscriptionStatus || 'active',
          monthsPaid
        });
      } else {
        // Update existing subscription
        subscription = await storage.updateSubscriptionMonthsPaid(userId, monthsPaid);
      }

      // Check if referral milestone is reached (2 months paid)
      if (monthsPaid >= 2) {
        await processReferralReward(userId);
      }

      res.json({ message: "Subscription updated successfully" });
    } catch (error) {
      console.error("Error processing subscription webhook:", error);
      res.status(500).json({ message: "Failed to process subscription update" });
    }
  });

  // Landing page for referral links
  app.get("/join", (req, res) => {
    const referralCode = req.query.ref as string;

    // Store referral code in session for signup process
    if (referralCode) {
      req.session = req.session || {};
      (req.session as any).referralCode = referralCode;
    }

    // Redirect to home page - the frontend will handle the referral signup flow
    res.redirect(`/?ref=${referralCode || ''}`);
  });

  // Get referral code from session (for frontend to use during signup)
  app.get("/api/referral/session-code", (req, res) => {
    const referralCode = (req.session as any)?.referralCode || null;
    res.json({ referralCode });
  });

  // Clear referral code from session after successful signup
  app.delete("/api/referral/session-code", (req, res) => {
    if (req.session) {
      delete (req.session as any).referralCode;
    }
    res.json({ message: "Referral code cleared from session" });
  });

  // Verify user subscription status
  app.get("/api/verify-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const verificationResult = {
        userId,
        userExists: !!user,
        userSubscriptionStatus: user?.subscriptionStatus,
        stripeCustomerId: user?.stripeCustomerId,
        stripeSubscriptionId: user?.stripeSubscriptionId,
        assessmentCompleted: user?.assessmentCompleted,
        isAdmin: user?.isAdmin,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt
      };

      console.log("User subscription verification:", verificationResult);
      res.json(verificationResult);
    } catch (error) {
      console.error("Error verifying subscription:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  // ============= PROMO CODE SYSTEM ROUTES =============

  // Validate promo code
  app.post("/api/promo-codes/validate", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.claims.sub;

      if (!code) {
        return res.status(400).json({ message: "Promo code is required" });
      }

      const promoCode = await storage.getPromoCodeByCode(code);
      
      if (!promoCode) {
        return res.status(404).json({ message: "Invalid promo code" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ message: "This promo code is no longer active" });
      }

      if (promoCode.expiresAt && new Date() > new Date(promoCode.expiresAt)) {
        return res.status(400).json({ message: "This promo code has expired" });
      }

      if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
        return res.status(400).json({ message: "This promo code has reached its usage limit" });
      }

      // Check if user has already used this promo code
      const hasUsed = await storage.hasUserUsedPromoCode(userId, promoCode.id);
      if (hasUsed) {
        return res.status(400).json({ message: "You have already used this promo code" });
      }

      res.json({
        valid: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          name: promoCode.name,
          description: promoCode.description,
          freeMonths: promoCode.freeMonths,
        }
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ message: "Failed to validate promo code" });
    }
  });

  // Apply promo code
  app.post("/api/promo-codes/apply", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.claims.sub;

      if (!code) {
        return res.status(400).json({ message: "Promo code is required" });
      }

      const promoCode = await storage.getPromoCodeByCode(code);
      
      if (!promoCode || !promoCode.isActive) {
        return res.status(404).json({ message: "Invalid or inactive promo code" });
      }

      if (promoCode.expiresAt && new Date() > new Date(promoCode.expiresAt)) {
        return res.status(400).json({ message: "This promo code has expired" });
      }

      if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
        return res.status(400).json({ message: "This promo code has reached its usage limit" });
      }

      // Check if user has already used this promo code
      const hasUsed = await storage.hasUserUsedPromoCode(userId, promoCode.id);
      if (hasUsed) {
        return res.status(400).json({ message: "You have already used this promo code" });
      }

      // Calculate expiration (promo months don't expire unless specified)
      const expiresAt = promoCode.expiresAt ? new Date(promoCode.expiresAt) : undefined;

      // Grant free months to user
      await storage.grantPromoFreeMonths(userId, promoCode.freeMonths, expiresAt);

      // Record the usage
      await storage.createPromoCodeUse({
        promoCodeId: promoCode.id,
        userId,
        freeMonthsGranted: promoCode.freeMonths,
      });

      // Increment usage count
      await storage.incrementPromoCodeUse(promoCode.id);

      res.json({
        success: true,
        message: `Successfully applied promo code! You now have ${promoCode.freeMonths} free months of premium access.`,
        freeMonthsGranted: promoCode.freeMonths,
      });
    } catch (error) {
      console.error("Error applying promo code:", error);
      res.status(500).json({ message: "Failed to apply promo code" });
    }
  });

  // Admin: Get all promo codes
  app.get("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      
      // Get usage details for each promo code
      const promoCodesWithUsage = await Promise.all(
        promoCodes.map(async (promoCode) => {
          const uses = await storage.getPromoCodeUses(promoCode.id);
          return {
            ...promoCode,
            uses,
            usageDetails: uses.map(use => ({
              userId: use.userId,
              usedAt: use.usedAt,
              freeMonthsGranted: use.freeMonthsGranted,
            }))
          };
        })
      );

      res.json(promoCodesWithUsage);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  // Admin: Create promo code
  app.post("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, name, description, freeMonths, maxUses, expiresAt } = req.body;

      if (!code || !name || !freeMonths) {
        return res.status(400).json({ message: "Code, name, and free months are required" });
      }

      // Check if code already exists
      const existingCode = await storage.getPromoCodeByCode(code);
      if (existingCode) {
        return res.status(400).json({ message: "Promo code already exists" });
      }

      const promoCode = await storage.createPromoCode({
        code: code.toUpperCase(),
        name,
        description,
        freeMonths: parseInt(freeMonths),
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      });

      res.json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  // Admin: Update promo code
  app.put("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodeId = parseInt(req.params.id);
      const { code, name, description, freeMonths, maxUses, expiresAt, isActive } = req.body;

      const updateData: any = {};
      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (freeMonths !== undefined) updateData.freeMonths = parseInt(freeMonths);
      if (maxUses !== undefined) updateData.maxUses = maxUses ? parseInt(maxUses) : null;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const promoCode = await storage.updatePromoCode(promoCodeId, updateData);
      res.json(promoCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  // Admin: Delete promo code
  app.delete("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodeId = parseInt(req.params.id);
      await storage.deletePromoCode(promoCodeId);
      res.json({ message: "Promo code deleted successfully" });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Failed to delete promo code" });
    }
  });

  // Verify assessment completion and data consistency
  app.get("/api/verify-assessment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const assessment = await storage.getUserAssessment(userId);

      const verificationResult = {
        userId,
        userExists: !!user,
        userAssessmentCompleted: user?.assessmentCompleted || false,
        assessmentRecordExists: !!assessment,
        assessmentId: assessment?.id || null,
        subscriptionStatus: user?.subscriptionStatus || 'none',
        currentProgramId: user?.currentProgramId || null,
        needsAssessmentRecord: user?.assessmentCompleted && !assessment,
        isConsistent: (user?.assessmentCompleted && !!assessment) || (!user?.assessmentCompleted && !assessment),
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt
      };

      // Log inconsistency warnings
      if (!verificationResult.isConsistent) {
        console.warn(`Assessment data inconsistency for user ${userId}:`, verificationResult);
      }

      // If user is marked as assessment complete but no assessment record exists, create one
      if (verificationResult.needsAssessmentRecord) {
        console.log(`Creating missing assessment record for user ${userId}`);
        try {
          const retroactiveAssessment = await storage.createAssessment({
            userId,
            data: JSON.stringify({ 
              retroactive: true, 
              created: new Date().toISOString(),
              note: 'Created retroactively due to missing assessment record'
            }),
            hyroxEventsCompleted: 0,
            generalFitnessYears: 1,
            primaryTrainingBackground: 'general',
            weeklyTrainingDays: 3,
            avgSessionLength: 60,
            competitionFormat: 'singles',
            age: 30,
            injuryHistory: false,
            injuryRecent: false,
            goals: 'general-fitness',
            equipmentAccess: 'full_gym',
            createdAt: new Date()
          });
          verificationResult.assessmentRecordExists = true;
          verificationResult.assessmentId = retroactiveAssessment.id;
          verificationResult.needsAssessmentRecord = false;
          verificationResult.isConsistent = true;
          console.log(`Successfully created retroactive assessment ${retroactiveAssessment.id} for user ${userId}`);
        } catch (retroError) {
          console.error("Failed to create retroactive assessment:", retroError);
        }
      }

      res.json(verificationResult);
    } catch (error) {
      console.error("Error verifying assessment:", error);
      res.status(500).json({ message: "Failed to verify assessment" });
    }
  });

  // Promo code validation endpoint
  app.post("/api/promo-codes/validate", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Promo code is required" });
      }

      const promoCode = await storage.getPromoCodeByCode(code.trim().toUpperCase());
      
      if (!promoCode) {
        return res.status(404).json({ message: "Invalid promo code" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ message: "Promo code is no longer active" });
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Promo code has expired" });
      }

      if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
        return res.status(400).json({ message: "Promo code usage limit reached" });
      }

      const userId = req.user.claims.sub;
      const hasUsed = await storage.hasUserUsedPromoCode(userId, promoCode.id);
      
      if (hasUsed) {
        return res.status(400).json({ message: "You have already used this promo code" });
      }

      res.json({
        valid: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          name: promoCode.name,
          description: promoCode.description,
          freeMonths: promoCode.freeMonths
        }
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ message: "Failed to validate promo code" });
    }
  });

  // Apply promo code endpoint
  app.post("/api/promo-codes/apply", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.claims.sub;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Promo code is required" });
      }

      const promoCode = await storage.getPromoCodeByCode(code.trim().toUpperCase());
      
      if (!promoCode) {
        return res.status(404).json({ message: "Invalid promo code" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ message: "Promo code is no longer active" });
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Promo code has expired" });
      }

      if (promoCode.maxUses && promoCode.usesCount >= promoCode.maxUses) {
        return res.status(400).json({ message: "Promo code usage limit reached" });
      }

      const hasUsed = await storage.hasUserUsedPromoCode(userId, promoCode.id);
      
      if (hasUsed) {
        return res.status(400).json({ message: "You have already used this promo code" });
      }

      // Grant free months to user
      await storage.grantPromoFreeMonths(userId, promoCode.freeMonths);

      // Record promo code usage
      await storage.createPromoCodeUse({
        promoCodeId: promoCode.id,
        userId: userId,
        freeMonthsGranted: promoCode.freeMonths
      });

      // Increment usage count
      await storage.incrementPromoCodeUse(promoCode.id);

      res.json({
        success: true,
        message: `${promoCode.freeMonths} free months granted successfully!`,
        freeMonthsGranted: promoCode.freeMonths
      });
    } catch (error) {
      console.error("Error applying promo code:", error);
      res.status(500).json({ message: "Failed to apply promo code" });
    }
  });

  // Admin: Get all promo codes
  app.get("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      
      // Get usage details for each promo code
      const promoCodesWithUses = await Promise.all(
        promoCodes.map(async (promoCode) => {
          const uses = await storage.getPromoCodeUses(promoCode.id);
          return {
            ...promoCode,
            uses
          };
        })
      );

      res.json(promoCodesWithUses);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  // Admin: Create promo code
  app.post("/api/admin/promo-codes", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const promoCodeData = {
        ...req.body,
        createdBy: userId,
        code: req.body.code.toUpperCase()
      };

      const promoCode = await storage.createPromoCode(promoCodeData);
      res.json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  // Admin: Update promo code
  app.put("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodeId = parseInt(req.params.id);
      const updateData = req.body;
      
      const promoCode = await storage.updatePromoCode(promoCodeId, updateData);
      res.json(promoCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  // Admin: Delete promo code
  app.delete("/api/admin/promo-codes/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const promoCodeId = parseInt(req.params.id);
      await storage.deletePromoCode(promoCodeId);
      res.json({ message: "Promo code deleted successfully" });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Failed to delete promo code" });
    }
  });

  // Create missing assessment record for testing
  app.post("/api/create-missing-assessment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if assessment already exists
      const existingAssessment = await storage.getUserAssessment(userId);
      if (existingAssessment) {
        return res.status(400).json({ 
          message: "Assessment record already exists",
          assessmentId: existingAssessment.id
        });
      }

      // Create assessment record
      const assessment = await storage.createAssessment({
        userId,
        data: JSON.stringify({ 
          retroactiveCreation: true, 
          created: new Date().toISOString(),
          note: 'Created via API for testing purposes',
          subscriptionStatus: user.subscriptionStatus || 'active'
        }),
        hyroxEventsCompleted: 0,
        generalFitnessYears: 2,
        primaryTrainingBackground: 'general',
        weeklyTrainingDays: 3,
        avgSessionLength: 60,
        competitionFormat: 'singles',
        age: 30,
        injuryHistory: false,
        injuryRecent: false,
        goals: 'general-fitness',
        equipmentAccess: 'full_gym',
        createdAt: new Date()
      });

      // Ensure user profile is marked as assessment completed
      await storage.updateUserProfile(userId, {
        assessmentCompleted: true,
        updatedAt: new Date()
      });

      res.json({ 
        success: true,
        message: "Assessment record created successfully",
        assessmentId: assessment.id,
        userId: userId
      });
    } catch (error) {
      console.error("Error creating assessment record:", error);
      res.status(500).json({ message: "Failed to create assessment record" });
    }
  });

  // Authentication middleware
  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }

  const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

  async function getUserStripeCustomer(userId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId
    };
  }

  async function createStripeCustomer(userId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!stripe) {
      throw new Error("Stripe not configured");
    }

    // Check if the user already has a Stripe customer ID
    if (user.stripeCustomerId) {
      console.warn(`User ${userId} already has a Stripe customer ID: ${user.stripeCustomerId}`);
      return {
        userId: user.id,
        stripeCustomerId: user.stripeCustomerId
      };
    }

    const customer = await stripe.customers.create({
      metadata: {
        userId: userId
      }
    });

    await db.update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, userId));

    return {
      userId: user.id,
      stripeCustomerId: customer.id
    };
  }





  const httpServer = createServer(app);
  return httpServer;
}