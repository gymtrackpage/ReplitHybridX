import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { selectHyroxProgram, HYROX_PROGRAMS } from "./programSelection";
import { loadProgramsFromCSV, calculateProgramSchedule } from "./programLoader";
import { determineUserProgramPhase, transitionUserToPhase, checkForPhaseTransition } from "./programPhaseManager";
import { seedHyroxPrograms } from "./seedData";
import Stripe from "stripe";
import { insertProgramSchema, insertWorkoutSchema, insertAssessmentSchema, insertWeightEntrySchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize programs and workouts if not already loaded
  try {
    const existingPrograms = await storage.getPrograms();
    if (existingPrograms.length === 0) {
      console.log("Loading HYROX programs and workouts...");
      await seedHyroxPrograms();
      await loadProgramsFromCSV();
    }
  } catch (error) {
    console.error("Error initializing programs:", error);
  }

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
      const user = await storage.getUser(userId);
      const progress = await storage.getUserProgress(userId);
      const todaysWorkout = await storage.getTodaysWorkout(userId);
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

  app.get('/api/programs/:id', async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
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

  // Workout routes
  app.get('/api/workouts/:id', async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
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
      const recommendedProgram = await storage.getPrograms().then(programs => 
        programs.find(p => p.name === programRecommendation.recommendedProgram.name)
      );
      
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
            startDate: new Date(),
            eventDate: eventDate,
            completedWorkouts: 0,
            totalWorkouts: recommendedProgram.duration ? recommendedProgram.duration * (recommendedProgram.frequency || 4) : 56
          });
        }
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

  // Stripe subscription route
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

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_default', // Set this in environment
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

  // Assessment endpoint with program selection algorithm
  app.post('/api/assessment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentData = req.body;
      
      // Use your program selection algorithm
      const programRecommendation = selectHyroxProgram(assessmentData);
      
      // Store the assessment data
      const validatedData = insertAssessmentSchema.parse({
        userId: userId,
        fitnessLevel: programRecommendation.experienceLevel,
        goals: assessmentData.goals || ["Complete first HYROX"],
        experience: assessmentData.primaryTrainingBackground || "General Fitness",
        timeAvailability: parseInt(assessmentData.weeklyTrainingDays) || 4,
        equipmentAccess: assessmentData.equipmentAccess || ["Full gym access"]
      });
      
      const assessment = await storage.createAssessment(validatedData);

      // Update user's fitness level
      await storage.updateUserAssessment(userId, programRecommendation.experienceLevel);
      
      // Find the recommended program in our database
      const programs = await storage.getPrograms();
      const matchingProgram = programs.find(p => 
        p.name.toLowerCase().includes(programRecommendation.recommendedProgram.name.toLowerCase().split(' ')[0])
      );
      
      if (matchingProgram) {
        await storage.updateUserProgram(userId, matchingProgram.id);
      }

      res.json({
        assessment,
        programRecommendation: {
          program: matchingProgram || programs[0],
          reasoning: programRecommendation.reasoningExplanation,
          modifications: programRecommendation.modifications,
          experienceLevel: programRecommendation.experienceLevel,
          trainingBackground: programRecommendation.trainingBackground,
          timeAvailability: programRecommendation.timeAvailability,
          specialCategory: programRecommendation.specialCategory
        }
      });
    } catch (error) {
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Failed to create assessment" });
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

  const httpServer = createServer(app);
  return httpServer;
}
