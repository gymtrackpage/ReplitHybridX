import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { StravaService } from "./stravaService";
import { generateRandomHyroxWorkout } from "./enhancedHyroxWorkoutGenerator";
import multer from "multer";
import * as XLSX from "xlsx";
import { selectHyroxProgram, HYROX_PROGRAMS } from "./programSelection";
import { loadProgramsFromCSV, calculateProgramSchedule } from "./programLoader";
import { determineUserProgramPhase, transitionUserToPhase, checkForPhaseTransition } from "./programPhaseManager";
import { seedHyroxPrograms } from "./seedData";
import { createMinimalPrograms } from "./quickProgramSetup";
import Stripe from "stripe";
import { insertProgramSchema, insertWorkoutSchema, insertAssessmentSchema, insertWeightEntrySchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Admin middleware
const requireAdmin = async (req: any, res: any, next: any) => {
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

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
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

      // Create initial progress tracking
      await storage.createUserProgress({
        userId,
        programId,
        currentWeek: 1,
        currentDay: 1,
        completedWorkouts: 0,
        totalWorkouts: 0,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error selecting program:", error);
      res.status(500).json({ message: "Failed to select program" });
    }
  });

  // Change program endpoint with date rescheduling
  app.put('/api/change-program', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId, eventDate } = req.body;

      // Get the new program details
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // Update user's current program
      await storage.updateUserProgram(userId, programId);

      // Calculate new program schedule if event date is provided
      let startDate = new Date();
      let currentWeek = 1;
      let currentDay = 1;
      let totalWorkouts = (program.duration || 12) * (program.frequency || 6); // Assuming 6 days per week
      
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
          
          // If calculated start date is in the future (more than 12 weeks), use maintenance program logic
          if (startDate > today) {
            // For now, start today at week 1 - maintenance program logic can be added later
            startDate = new Date(today);
          }
        }
      }

      // Get existing progress or create new one
      const existingProgress = await storage.getUserProgress(userId);
      
      if (existingProgress) {
        // Update existing progress with new program
        await storage.updateUserProgress(userId, {
          programId: programId,
          currentWeek: currentWeek,
          currentDay: currentDay,
          startDate: startDate.toISOString(),
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          totalWorkouts: totalWorkouts,
          completedWorkouts: 0
        });
      } else {
        // Create new progress tracking
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
    } catch (error) {
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

  // Assessment routes
  app.post('/api/assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Use your program selection algorithm
      const programRecommendation = selectHyroxProgram(req.body);
      
      const assessmentData = insertAssessmentSchema.parse({
        ...req.body,
        userId,
        data: JSON.stringify(req.body), // Store full assessment data
      });

      const assessment = await storage.createAssessment(assessmentData);
      
      // Update user with recommended program
      const programs = await storage.getPrograms();
      console.log("Available programs:", programs.map(p => p.name));
      console.log("Recommended program name:", programRecommendation.recommendedProgram.name);
      
      // Map recommendation to actual program names
      const programNameMapping: { [key: string]: string } = {
        "Complete Beginner 14-Week Program": "Beginner Program",
        "Intermediate HYROX 14-Week Program": "Intermediate Program", 
        "Advanced HYROX 14-Week Program": "Advanced Program",
        "Advanced Competitor 14-Week Program": "Advanced Program",
        "Strength-Focused 14-Week Program": "Strength Program",
        "Running-Focused 14-Week Program": "Runner Program",
        "HYROX Doubles 14-Week Program": "Doubles Program"
      };
      
      const actualProgramName = programNameMapping[programRecommendation.recommendedProgram.name] || 
                               programRecommendation.recommendedProgram.name;
      
      const recommendedProgram = programs.find(p => p.name === actualProgramName);
      
      if (recommendedProgram) {
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
        
        console.log(`Successfully assigned ${actualProgramName} to user ${userId}`);
      } else {
        console.error(`Program not found: ${actualProgramName}. Available programs:`, programs.map(p => p.name));
      }
      
      // Update user's fitness level based on program recommendation
      const fitnessLevel = programRecommendation.experienceLevel;
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

  // Workout completion
  app.post('/api/complete-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, duration, notes, exerciseData } = req.body;

      // Create workout completion record
      const completion = await storage.createWorkoutCompletion({
        userId,
        workoutId,
        duration,
        notes,
        exerciseData: JSON.stringify(exerciseData)
      });

      // Update user progress
      const progress = await storage.getUserProgress(userId);
      if (progress) {
        await storage.updateUserProgress(userId, {
          completedWorkouts: progress.completedWorkouts + 1
        });
      }

      // Update user's total workout count and streak
      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserProfile(userId, {
          totalWorkouts: user.totalWorkouts + 1,
          streak: user.streak + 1
        });
      }

      res.json(completion);
    } catch (error) {
      console.error("Error completing workout:", error);
      res.status(500).json({ message: "Failed to complete workout" });
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
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = subscription.latest_invoice;
        const clientSecret = typeof invoice === 'object' && invoice?.payment_intent 
          ? (typeof invoice.payment_intent === 'object' ? invoice.payment_intent.client_secret : null)
          : null;
        return res.json({
          subscriptionId: subscription.id,
          clientSecret,
        });
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
      const { name, description, difficulty, duration, frequency, category } = req.body;
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
        category
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

  // Stripe payment integration
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount, currency = "usd" } = req.body;
      const userId = req.user.claims.sub;
      
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

      // Check for existing subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription.status === 'active') {
          return res.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
          });
        }
      }

      // Create new subscription with default monthly price
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Hybrid X Training Program',
              description: 'Access to all HYROX training programs and features'
            },
            unit_amount: 2999, // $29.99/month
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      });
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Phase transition management
  app.post("/api/check-phase-transition", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { checkForPhaseTransition, transitionUserToPhase } = await import('./programPhaseManager');
      
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

  // Workout completion with progression logic
  app.post("/api/workout-completions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId, rating, notes, skipped = false } = req.body;

      // Get current progress to determine next day
      const progress = await storage.getUserProgress(userId);
      if (!progress) {
        return res.status(404).json({ message: "User progress not found" });
      }

      // Create workout completion record
      const completion = await storage.createWorkoutCompletion({
        userId,
        workoutId,
        rating: rating || null,
        notes: notes || null,
        skipped,
        completedAt: new Date()
      });

      // Calculate next day/week progression
      const currentDay = progress.currentDay || 1;
      const currentWeek = progress.currentWeek || 1;
      let nextDay = currentDay + 1;
      let nextWeek = currentWeek;

      // Check if we need to advance to next week (assuming 7 days per week)
      if (nextDay > 7) {
        nextDay = 1;
        nextWeek = currentWeek + 1;
      }

      // Update user progress with next day/week
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
      const programsWithWorkouts = await Promise.all(
        programs.map(async (program) => {
          const workouts = await storage.getWorkoutsByProgram(program.id);
          return { ...program, workouts };
        })
      );
      res.json(programsWithWorkouts);
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

  app.put('/api/admin/workouts/:id', requireAdmin, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      const updateData = req.body;
      const workout = await storage.updateWorkout(workoutId, updateData);
      res.json(workout);
    } catch (error) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: "Failed to update workout" });
    }
  });

  app.delete('/api/admin/workouts/:id', requireAdmin, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.id);
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

  // Strava integration routes
  app.get('/api/strava/connect', isAuthenticated, async (req: any, res) => {
    try {
      const authUrl = StravaService.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Error getting Strava auth URL:", error);
      res.status(500).json({ message: "Failed to get Strava authorization URL" });
    }
  });

  app.get('/api/strava/callback', async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.status(400).json({ message: "Authorization code not provided" });
      }

      // For now, we'll need to associate this with a user session
      // In a real implementation, you'd pass the user ID in the state parameter
      if (!req.isAuthenticated()) {
        return res.redirect('/profile?strava_error=not_authenticated');
      }

      const userId = (req.user as any).claims.sub;
      const tokens = await StravaService.exchangeCodeForTokens(code as string);

      // Store tokens in user record
      await storage.updateUser(userId, {
        stravaUserId: tokens.athlete.id.toString(),
        stravaAccessToken: tokens.access_token,
        stravaRefreshToken: tokens.refresh_token,
        stravaTokenExpiry: new Date(tokens.expires_at * 1000),
        stravaConnected: true,
      });

      res.redirect('/profile?strava_connected=true');
    } catch (error) {
      console.error("Error in Strava callback:", error);
      res.redirect('/profile?strava_error=connection_failed');
    }
  });

  app.post('/api/strava/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await StravaService.disconnectStrava(userId);
      res.json({ success: true, message: "Strava disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting Strava:", error);
      res.status(500).json({ message: "Failed to disconnect Strava" });
    }
  });

  app.post('/api/strava/push-workout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { workoutId } = req.body;

      if (!workoutId) {
        return res.status(400).json({ message: "Workout ID is required" });
      }

      // Get workout details
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      // Get completion details
      const completions = await storage.getWorkoutCompletions(userId);
      const completion = completions.find(c => c.workoutId === workoutId);
      
      if (!completion) {
        return res.status(400).json({ message: "Workout not completed yet" });
      }

      // Prepare workout data for Strava
      const workoutData = {
        name: workout.name,
        description: workout.description || `${workout.name} - Hybrid X Training`,
        duration: completion.duration || workout.duration * 60, // Convert minutes to seconds
        type: 'workout' as const,
        start_date_local: completion.completedAt ? 
          completion.completedAt.toISOString() : 
          new Date().toISOString()
      };

      const success = await StravaService.pushWorkoutToStrava(userId, workoutData);
      
      if (success) {
        res.json({ success: true, message: "Workout pushed to Strava successfully" });
      } else {
        res.status(500).json({ message: "Failed to push workout to Strava" });
      }
    } catch (error) {
      console.error("Error pushing workout to Strava:", error);
      res.status(500).json({ message: "Failed to push workout to Strava" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
