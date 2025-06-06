import {
  users,
  programs,
  workouts,
  userProgress,
  workoutCompletions,
  assessments,
  weightEntries,
  type User,
  type UpsertUser,
  type Program,
  type InsertProgram,
  type Workout,
  type InsertWorkout,
  type UserProgress,
  type InsertUserProgress,
  type WorkoutCompletion,
  type InsertWorkoutCompletion,
  type Assessment,
  type InsertAssessment,
  type WeightEntry,
  type InsertWeightEntry,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateUserProgram(userId: string, programId: number): Promise<User>;
  updateUserAssessment(userId: string, fitnessLevel: string): Promise<User>;
  updateUserProfile(userId: string, profileData: Partial<UpsertUser>): Promise<User>;

  // Program operations
  getPrograms(): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: number): Promise<void>;

  // Workout operations
  getWorkoutsByProgram(programId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  getTodaysWorkout(userId: string): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout>;
  deleteWorkout(id: number): Promise<void>;

  // Progress operations
  getUserProgress(userId: string): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(userId: string, updates: Partial<InsertUserProgress>): Promise<UserProgress>;

  // Workout completion operations
  getWorkoutCompletions(userId: string): Promise<WorkoutCompletion[]>;
  getWeeklyCompletions(userId: string): Promise<WorkoutCompletion[]>;
  createWorkoutCompletion(completion: InsertWorkoutCompletion): Promise<WorkoutCompletion>;

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getUserAssessment(userId: string): Promise<Assessment | undefined>;

  // Weight tracking operations
  getUserWeightEntries(userId: string): Promise<WeightEntry[]>;
  createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(userId: string, isAdmin: boolean): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProgram(userId: string, programId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        currentProgramId: programId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserAssessment(userId: string, fitnessLevel: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        fitnessLevel,
        assessmentCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, profileData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Program operations
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs).where(eq(programs.isActive, true)).orderBy(asc(programs.name));
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  async updateProgram(id: number, program: Partial<InsertProgram>): Promise<Program> {
    const [updatedProgram] = await db
      .update(programs)
      .set({ ...program, updatedAt: new Date() })
      .where(eq(programs.id, id))
      .returning();
    return updatedProgram;
  }

  async deleteProgram(id: number): Promise<void> {
    await db.update(programs).set({ isActive: false }).where(eq(programs.id, id));
  }

  // Workout operations
  async getWorkoutsByProgram(programId: number): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.programId, programId))
      .orderBy(asc(workouts.week), asc(workouts.day));
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async getTodaysWorkout(userId: string): Promise<Workout | undefined> {
    // Get user's current progress
    const progress = await this.getUserProgress(userId);
    if (!progress) return undefined;

    // Calculate which workout should be shown today based on schedule
    let currentWeek = progress.currentWeek;
    let currentDay = progress.currentDay;

    // Use the stored progress values directly - they are already calculated correctly
    // when the program is scheduled, taking into account event dates
    currentWeek = progress.currentWeek;
    currentDay = progress.currentDay;

    // Find the workout for calculated week and day
    const [workout] = await db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.programId, progress.programId),
          eq(workouts.week, currentWeek),
          eq(workouts.day, currentDay)
        )
      );
    return workout;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout).returning();
    return newWorkout;
  }

  async updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout> {
    const [updatedWorkout] = await db
      .update(workouts)
      .set(workout)
      .where(eq(workouts.id, id))
      .returning();
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  // Progress operations
  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.isActive, true)));
    return progress;
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [newProgress] = await db.insert(userProgress).values(progress).returning();
    return newProgress;
  }

  async updateUserProgress(userId: string, updates: Partial<InsertUserProgress>): Promise<UserProgress> {
    const [updatedProgress] = await db
      .update(userProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(userProgress.userId, userId), eq(userProgress.isActive, true)))
      .returning();
    return updatedProgress;
  }

  // Workout completion operations
  async getWorkoutCompletions(userId: string): Promise<WorkoutCompletion[]> {
    return await db
      .select()
      .from(workoutCompletions)
      .where(eq(workoutCompletions.userId, userId))
      .orderBy(desc(workoutCompletions.completedAt));
  }

  async getWeeklyCompletions(userId: string): Promise<WorkoutCompletion[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return await db
      .select()
      .from(workoutCompletions)
      .where(
        and(
          eq(workoutCompletions.userId, userId),
          and(
            gte(workoutCompletions.completedAt, startOfWeek),
            lte(workoutCompletions.completedAt, endOfWeek)
          ),
          eq(workoutCompletions.skipped, false) // Only count completed workouts, not skipped ones
        )
      )
      .orderBy(desc(workoutCompletions.completedAt));
  }

  async createWorkoutCompletion(completion: InsertWorkoutCompletion): Promise<WorkoutCompletion> {
    const [newCompletion] = await db.insert(workoutCompletions).values(completion).returning();
    return newCompletion;
  }

  // Assessment operations
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db.insert(assessments).values(assessment).returning();
    return newAssessment;
  }

  async getUserAssessment(userId: string): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.completedAt));
    return assessment;
  }

  // Weight tracking operations
  async getUserWeightEntries(userId: string): Promise<WeightEntry[]> {
    return await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, userId))
      .orderBy(desc(weightEntries.recordedAt));
  }

  async createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry> {
    const [newEntry] = await db.insert(weightEntries).values(entry).returning();
    return newEntry;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
