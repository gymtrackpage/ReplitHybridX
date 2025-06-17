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
import { eq, and, desc, asc, gte, lte, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<User>;
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
  getProgramWorkouts(programId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  getTodaysWorkout(userId: string): Promise<Workout | undefined>;
  getUserWorkoutHistory(userId: string): Promise<WorkoutCompletion[]>;
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
  updateUserAdmin(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getTotalUsers(): Promise<number>;
  getActiveSubscriptions(): Promise<number>;
  getTotalPrograms(): Promise<number>;
  getTotalWorkouts(): Promise<number>;
  getAllProgramsWithWorkoutCount(): Promise<(Program & { workoutCount: number })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        updatedAt: new Date()
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
        updatedAt: new Date()
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
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, profileData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Program operations
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs).where(eq(programs.isActive, true)).orderBy(desc(programs.createdAt));
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
      .set(program)
      .where(eq(programs.id, id))
      .returning();
    return updatedProgram;
  }

  async deleteProgram(programId: number): Promise<void> {
    // Delete all workouts first
    await db.delete(workouts).where(eq(workouts.programId, programId));

    // Then delete the program
    await db.delete(programs).where(eq(programs.id, programId));
  }

  async updateWorkout(workoutId: number, updateData: any): Promise<any> {
    const [updatedWorkout] = await db
      .update(workouts)
      .set({
        ...updateData,
        exercises: updateData.exercises ? JSON.stringify(updateData.exercises) : undefined,
        updatedAt: new Date()
      })
      .where(eq(workouts.id, workoutId))
      .returning();

    return updatedWorkout;
  }

  async deleteWorkout(workoutId: number): Promise<void> {
    // Delete workout completions first
    await db.delete(workoutCompletions).where(eq(workoutCompletions.workoutId, workoutId));

    // Then delete the workout
    await db.delete(workouts).where(eq(workouts.id, workoutId));
  }

  // Workout operations
  async getWorkoutsByProgram(programId: number) {
    console.log("Storage: Fetching workouts for program ID:", programId);
    try {
      const result = await db.select().from(workouts).where(eq(workouts.programId, programId)).orderBy(asc(workouts.week), asc(workouts.day));
      console.log("Storage: Found", result.length, "workouts for program", programId);
      console.log("Storage: Sample workout data:", result.length > 0 ? result[0] : "No workouts found");
      return result;
    } catch (error) {
      console.error("Storage error fetching workouts for program", programId, ":", error);
      return [];
    }
  }

  async getProgramWorkouts(programId: number): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.programId, programId))
      .orderBy(asc(workouts.week), asc(workouts.day));
  }

  async getUserWorkoutHistory(userId: string): Promise<WorkoutCompletion[]> {
    return await db
      .select()
      .from(workoutCompletions)
      .where(eq(workoutCompletions.userId, userId))
      .orderBy(desc(workoutCompletions.completedAt));
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async getTodaysWorkout(userId: string): Promise<Workout | undefined> {
    const user = await this.getUser(userId);
    if (!user?.currentProgramId) {
      console.log(`No current program for user ${userId}`);
      return undefined;
    }

    let progress = await this.getUserProgress(userId);

    // If no progress exists, create initial progress
    if (!progress) {
      console.log(`Creating initial progress for user ${userId}`);
      progress = await this.createUserProgress({
        userId,
        programId: user.currentProgramId,
        currentWeek: 1,
        currentDay: 1,
        startDate: new Date().toISOString(),
        completedWorkouts: 0,
        totalWorkouts: 0
      });
    }

    // If progress exists but for different program, reset to week 1 day 1
    if (progress.programId !== user.currentProgramId) {
      console.log(`Program mismatch for user ${userId}, resetting progress`);
      progress = await this.updateUserProgress(userId, {
        programId: user.currentProgramId,
        currentWeek: 1,
        currentDay: 1,
        startDate: new Date().toISOString(),
        completedWorkouts: 0
      });
    }

    let currentWeek = progress.currentWeek || 1;
    let currentDay = progress.currentDay || 1;

    console.log(`Looking for workout: Program ${progress.programId}, Week ${currentWeek}, Day ${currentDay} for user ${userId}`);

    // Get all workouts for this program to understand the structure
    const allWorkouts = await db
      .select()
      .from(workouts)
      .where(eq(workouts.programId, progress.programId))
      .orderBy(asc(workouts.week), asc(workouts.day));

    console.log(`Total workouts in program: ${allWorkouts.length}`);

    if (allWorkouts.length === 0) {
      console.log(`No workouts found for program ${progress.programId}`);
      return undefined;
    }

    // Try to find the exact workout first
    let workout = allWorkouts.find(w => w.week === currentWeek && w.day === currentDay);

    // If no exact match found, try to find the next available workout
    if (!workout) {
      console.log(`No exact workout found for Week ${currentWeek}, Day ${currentDay}. Looking for next available workout...`);

      // Find the next workout in sequence
      const nextWorkout = allWorkouts.find(w => 
        w.week > currentWeek || (w.week === currentWeek && w.day > currentDay)
      );

      if (nextWorkout) {
        console.log(`Found next workout: Week ${nextWorkout.week}, Day ${nextWorkout.day}`);

        // Update progress to match the found workout
        await this.updateUserProgress(userId, {
          currentWeek: nextWorkout.week,
          currentDay: nextWorkout.day
        });

        workout = nextWorkout;
      } else {
        // If no next workout found, check if we need to cycle back to beginning
        const firstWorkout = allWorkouts[0];
        if (firstWorkout) {
          console.log(`End of program reached. Cycling back to Week ${firstWorkout.week}, Day ${firstWorkout.day}`);

          // Update progress to start over
          await this.updateUserProgress(userId, {
            currentWeek: firstWorkout.week,
            currentDay: firstWorkout.day
          });

          workout = firstWorkout;
        }
      }
    }

    if (workout) {
      console.log(`Returning workout: ${workout.name} (Week ${workout.week}, Day ${workout.day})`);
    } else {
      console.log(`No workout could be found or determined for user ${userId}`);
    }

    return workout;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const [newWorkout] = await db.insert(workouts).values(workout).returning();
    return newWorkout;
  }

  // Progress operations
  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress;
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [newProgress] = await db.insert(userProgress).values(progress).returning();
    return newProgress;
  }

  async updateUserProgress(userId: string, updates: Partial<InsertUserProgress>): Promise<UserProgress> {
    const [updatedProgress] = await db
      .update(userProgress)
      .set(updates)
      .where(eq(userProgress.userId, userId))
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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return await db
      .select()
      .from(workoutCompletions)
      .where(
        and(
          eq(workoutCompletions.userId, userId),
          gte(workoutCompletions.completedAt, oneWeekAgo)
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
      .orderBy(desc(assessments.createdAt));
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

  async updateUserAdmin(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete user and related data
    await db.delete(workoutCompletions).where(eq(workoutCompletions.userId, userId));
    await db.delete(userProgress).where(eq(userProgress.userId, userId));
    await db.delete(assessments).where(eq(assessments.userId, userId));
    await db.delete(weightEntries).where(eq(weightEntries.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getTotalUsers(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getActiveSubscriptions(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(isNotNull(users.stripeSubscriptionId));
    return result[0]?.count || 0;
  }

  async getTotalPrograms(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(programs);
    return result[0]?.count || 0;
  }

  async getTotalWorkouts(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(workouts);
    return result[0]?.count || 0;
  }

  async getAllProgramsWithWorkoutCount(): Promise<(Program & { workoutCount: number })[]> {
    const programsData = await db.select().from(programs).orderBy(desc(programs.createdAt));

    const result = await Promise.all(
      programsData.map(async (program: Program) => {
        const workoutCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(workouts)
          .where(eq(workouts.programId, program.id));

        return {
          ...program,
          workoutCount: workoutCountResult[0]?.count || 0
        };
      })
    );

    return result;
  }

  // Additional methods needed by routes
  async disconnectStrava(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stravaConnected: false,
        stravaUserId: null,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async pushWorkoutToStrava(userId: string, workoutData: any): Promise<boolean> {
    // This would typically integrate with Strava API
    // For now, just return true as placeholder
    console.log(`Pushing workout to Strava for user ${userId}:`, workoutData);
    return true;
  }
}

export const storage = new DatabaseStorage();