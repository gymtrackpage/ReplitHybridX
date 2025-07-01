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
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
};

// Check required environment variables
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
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
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        assessmentCompleted: user.assessmentCompleted || false,
        subscriptionStatus: user.subscriptionStatus || "none",
        currentProgramId: user.currentProgramId,
        hasCompletedOnboarding: (user.assessmentCompleted && user.subscriptionStatus !== "none")
      });
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
      const monthYear = req.query.queryKey ? req.query.queryKey.split(',')[1] : req.query.month;

      if (!monthYear) {
        return res.status(400).json({ message: "Month parameter required (YYYY-MM format)" });
      }

      // Get user and check access level
      const user = await storage.getUser(userId);
      const userProgress = await storage.getUserProgress(userId);

      // Check if user has proper access to programs
      const hasAssessment = user?.assessmentCompleted;
      const hasActiveProgram = userProgress?.programId;
      const isAdmin = user?.isAdmin;
      const isPremium = user?.subscriptionStatus === 'active';

      // Only show calendar for users with proper access
      if (!isAdmin && !hasAssessment) {
        return res.json({ workouts: [] });
      }

      if (!hasActiveProgram) {
        return res.json({ workouts: [] });
      }

      // Get actual workout completions/skips from database
      const completions = await storage.getUserWorkoutCompletions(userId);

      // Create calendar entries only from actual historical data
      const calendarWorkouts = [];

      // Add completed/skipped workouts
      for (const completion of completions) {
        const completedDate = new Date(completion.completedAt);
        const completedMonthYear = completedDate.toISOString().substring(0, 7); // YYYY-MM

        if (completedMonthYear === monthYear) {
          const workout = await storage.getWorkout(completion.workoutId);
          if (workout) {
            calendarWorkouts.push({
              date: completedDate.toISOString().split('T')[0],
              status: completion.skipped ? 'skipped' : 'completed',
              workout: {
                id: workout.id,
                name: workout.name,
                description: workout.description,
                estimatedDuration: workout.estimatedDuration || 60,
                workoutType: workout.workoutType || 'training',
                week: workout.week,
                day: workout.day,
                exercises: workout.exercises || [],
                completedAt: completion.completedAt,
                comments: completion.notes,
                rating: completion.rating
              }
            });
          }
        }
      }

      // For premium/admin users, add today's workout if it exists and hasn't been completed
      if ((isPremium || isAdmin) && userProgress) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const todayMonthYear = today.toISOString().substring(0, 7);

        if (todayMonthYear === monthYear) {
          // Check if today's workout already exists in calendar
          const todayWorkoutExists = calendarWorkouts.some(w => w.date === todayString);

          if (!todayWorkoutExists) {
            // Get today's scheduled workout
            const todaysWorkout = await storage.getTodaysWorkout(userId);
            if (todaysWorkout) {
              calendarWorkouts.push({
                date: todayString,
                status: 'upcoming',
                workout: {
                  id: todaysWorkout.id,
                  name: todaysWorkout.name,
                  description: todaysWorkout.description,
                  estimatedDuration: todaysWorkout.estimatedDuration || 60,
                  workoutType: todaysWorkout.workoutType || 'training',
                  week: todaysWorkout.week,
                  day: todaysWorkout.day,
                  exercises: todaysWorkout.exercises || []
                }
              });
            }
          }
        }
      }

      // Sort workouts by date
      calendarWorkouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({ workouts: calendarWorkouts });
    } catch (error) {
      console.error("Error fetching workout calendar:", error);
      res.status(500).json({ message: "Failed to fetch workout calendar" });
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

  // Workout calendar - get workouts for a specific month
  app.get('/api/workout-calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const monthYear = req.query.queryKey ? req.query.queryKey.split(',')[1] : req.query.month;

      if (!monthYear) {
        return res.status(400).json({ message: "Month parameter required (YYYY-MM format)" });
      }

      // Get user's current program and progress
      const userProgress = await storage.getUserProgress(userId);
      if (!userProgress || !userProgress.programId) {
        return res.json({ workouts: [] });
      }

      // Get all workouts for the user's current program
      const programWorkouts = await storage.getProgramWorkouts(userProgress.programId);

      // Get user's workout completions
      const completions = await storage.getUserWorkoutCompletions(userId);

      // Calculate workout schedule based on start date and program structure
      const startDate = userProgress.startDate ? new Date(userProgress.startDate) : new Date();
      const workoutCalendar = [];

      for (const workout of programWorkouts) {
        // Calculate the date for this workout based on week/day
        const workoutDate = new Date(startDate);
        workoutDate.setDate(startDate.getDate() + ((workout.week - 1) * 7) + (workout.day - 1));

        // Check if this workout date falls in the requested month
        const workoutMonthYear = workoutDate.toISOString().substring(0, 7); // YYYY-MM
        if (workoutMonthYear === monthYear) {
          // Check completion status
          const completion = completions.find((c: any) => c.workoutId === workout.id);
          let status = 'upcoming';

          if (completion) {
            status = 'completed';
          } else if (workoutDate < new Date()) {
            status = 'missed';
          }

          workoutCalendar.push({
            date: workoutDate.toISOString().split('T')[0],
            status,
            workout: {
              id: workout.id,
              name: workout.name,
              description: workout.description,
              estimatedDuration: workout.estimatedDuration || 60,
              workoutType: 'training',
              week: workout.week,
              day: workout.day,
              exercises: workout.exercises || [],
              completedAt: completion?.completedAt,
              comments: completion?.notes
            }
          });
        }
      }

      res.json({ workouts: workoutCalendar });
    } catch (error) {
      console.error("Error fetching workout calendar:", error);
      res.status(500).json({ message: "Failed to fetch workout calendar" });
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

  // Complete assessment after payment success
  app.post('/api/complete-assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assessmentData, programId, subscriptionChoice } = req.body;

      // Create assessment record
      const assessment = await storage.createAssessment({
        userId,
        data: JSON.stringify(assessmentData),
        ...assessmentData
      });

      // Update user profile
      await storage.updateUserProfile(userId, {
        assessmentCompleted: true,
        subscriptionStatus: subscriptionChoice === "premium" ? "active" : "free_trial",
        currentProgramId: programId,
        updatedAt: new Date()
      });

      // Create initial progress tracking
      const existingProgress = await storage.getUserProgress(userId);
      if (!existingProgress) {
        await storage.createUserProgress({
          userId,
          programId,
          currentWeek: 1,
          currentDay: 1,
          startDate: new Date().toISOString(),
          completedWorkouts: 0,
          totalWorkouts: 84 // Default for 12-week program
        });
      }

      res.json({ success: true, assessment });
    } catch (error) {
      console.error("Error completing assessment:", error);
      res.status(500).json({ message: "Failed to complete assessment" });
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

      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          const invoice = subscription.latest_invoice;
          const clientSecret = typeof invoice === 'object' && invoice?.payment_intent 
            ? (typeof invoice.payment_intent === 'object' ? invoice.payment_intent.client_secret : null)
            : null;
          return res.json({
            subscriptionId: subscription.id,
            clientSecret,
          });
        } catch (stripeError) {
          console.error("Existing subscription not found:", stripeError);
          // Continue to create new subscription
        }
      }

      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });

      // Create £5/month subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'HybridX Premium',
              description: 'Access to all HYROX training programs and features'
            },
            unit_amount: 500, // £5.00/month (500 pence)
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);

      const invoice = subscription.latest_invoice;
      const clientSecret = typeof invoice === 'object' && invoice?.payment_intent 
        ? (typeof invoice.payment_intent === 'object' ? invoice.payment_intent.client_secret : null)
        : null;

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(400).json({ error: { message: error.message } });
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

      let subscriptionStatus = {
        isSubscribed: false,
        subscriptionStatus: 'inactive' as const,
        subscriptionId: user.stripeSubscriptionId,
        customerId: user.stripeCustomerId,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
      };

      // Check Stripe subscription status if user has a subscription ID
      if (user.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

          subscriptionStatus = {
            isSubscribed: subscription.status === 'active',
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            customerId: subscription.customer as string,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          };
        } catch (stripeError) {
          console.error("Error fetching subscription from Stripe:", stripeError);
          // If subscription not found in Stripe, mark as inactive
          await storage.updateUserStripeInfo(userId, user.stripeCustomerId || "", "");
        }
      }

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
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
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

      // Create new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'HybridX Premium',
              description: 'Access to all HYROX training programs and premium features'
            },
            unit_amount: 500, // £5.00
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;

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

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      // Verify payment intent is successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not confirmed" });
      }

      // Update user subscription status
      await storage.updateUserProfile(userId, {
        subscriptionStatus: "active",
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: "Subscription confirmed successfully"
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

    if (!stripe || !webhookSecret) {
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        const successfulInvoice = event.data.object;
        const successSubscriptionId = successfulInvoice.subscription;
        if (successSubscriptionId) {
          const user = await storage.getUserByStripeSubscriptionId(successSubscriptionId as string);
          if (user) {
            await storage.updateUserProfile(user.id, {
              subscriptionStatus: "active",
              updatedAt: new Date()
            });
            console.log(`Payment succeeded for user ${user.id}`);
          }
        }
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

      const updatedUser = await storage.updateUserAdmin(targetUserId, isAdmin);
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
      const progress = await storage.getUserProgress(userId);
      if (!progress) {
        console.error("User progress not found for user:", userId);
        // Create initial progress if it doesn't exist
        const initialProgress = await storage.createUserProgress({
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
        .orderBy(workouts.week, workouts.day);

      console.log(`Program has ${allWorkouts.length} total workouts`);

      // Calculate next day/week progression
      const currentDay = progress.currentDay || 1;
      const currentWeek = progress.currentWeek || 1;
      let nextDay = currentDay + 1;
      let nextWeek = currentWeek;

      // Check if we need to advance to next week (6 training days per week: Mon-Sat)
      // Day 7 (Sunday) is rest, so after day 6 we go to day 1 of next week
      if (nextDay > 6) {
        nextDay = 1;
        nextWeek = currentWeek + 1;
      }

      // Verify the next workout exists, if not find the next available one
      const nextWorkoutExists = allWorkouts.find(w => w.week === nextWeek && w.day === nextDay);

      if (!nextWorkoutExists && allWorkouts.length > 0) {
        console.log(`Next workout Week ${nextWeek} Day ${nextDay} doesn't exist. Finding next available workout...`);

        // Find the next workout in chronological order
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
        const user = await storage.getUser(userId);
        if (user) {
          await storage.updateUserProfile(userId, {
            totalWorkouts: (user.totalWorkouts || 0) + 1,
            streak: (user.streak || 0) + 1
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

  const httpServer = createServer(app);
  return httpServer;
}