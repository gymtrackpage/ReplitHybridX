import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";
import { insertProgramSchema, insertWorkoutSchema, insertAssessmentSchema, insertWeightEntrySchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      const assessmentData = insertAssessmentSchema.parse({
        ...req.body,
        userId,
      });

      const assessment = await storage.createAssessment(assessmentData);
      
      // Update user's fitness level
      await storage.updateUserAssessment(userId, req.body.fitnessLevel);

      res.json(assessment);
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

  const httpServer = createServer(app);
  return httpServer;
}
