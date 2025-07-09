import {
  users,
  programs,
  workouts,
  userProgress,
  workoutCompletions,
  assessments,
  weightEntries,
  referrals,
  subscriptions,
  promoCodes,
  promoCodeUses,
  type UpsertUser,
  type User,
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
  type Referral,
  type InsertReferral,
  type Subscription,
  type InsertSubscription,
  type PromoCode,
  type InsertPromoCode,
  type PromoCodeUse,
  type InsertPromoCodeUse,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, isNotNull, asc } from "drizzle-orm";

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
  getUserWorkoutCompletions(userId: string): Promise<WorkoutCompletion[]>;
  getWeeklyCompletions(userId: string): Promise<WorkoutCompletion[]>;
  createWorkoutCompletion(completion: InsertWorkoutCompletion): Promise<WorkoutCompletion>;

  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getUserAssessment(userId: string): Promise<Assessment | undefined>;

  // Weight tracking operations
  getUserWeightEntries(userId: string): Promise<WeightEntry[]>;
  createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry>;

  // Referral operations
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getReferralByReferee(refereeId: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateUserReferredBy(userId: string, referralCode: string): Promise<User>;
  updateReferralStatus(referralId: number, status: string, qualifiedAt?: Date): Promise<Referral>;
  updateReferralRewardClaimed(referralId: number, claimedAt: Date): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  incrementUserFreeMonths(userId: string): Promise<User>;

  // Subscription operations
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;
  addFreeMonthToSubscription(subscriptionId: number): Promise<Subscription>;
  updateSubscriptionMonthsPaid(userId: string, monthsPaid: number): Promise<Subscription>;

  // Promo code operations
  getPromoCodeByCode(code: string): Promise<(PromoCode & { uses?: PromoCodeUse[] }) | undefined>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, updates: Partial<InsertPromoCode>): Promise<PromoCode>;
  deletePromoCode(id: number): Promise<void>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  incrementPromoCodeUse(promoCodeId: number): Promise<PromoCode>;
  createPromoCodeUse(use: InsertPromoCodeUse): Promise<PromoCodeUse>;
  getPromoCodeUses(promoCodeId: number): Promise<PromoCodeUse[]>;
  hasUserUsedPromoCode(userId: string, promoCodeId: number): Promise<boolean>;
  grantPromoFreeMonths(userId: string, months: number, expiresAt?: Date): Promise<User>;

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

  async updateProgram(programId: number, updateData: any): Promise<any> {
    console.log("Storage: Updating program", programId, "with data:", updateData);

    const [updatedProgram] = await db
      .update(programs)
      .set({
        name: updateData.name,
        description: updateData.description,
        difficulty: updateData.difficulty,
        category: updateData.category,
        duration: updateData.duration,
        frequency: updateData.frequency,
        updatedAt: new Date()
      })
      .where(eq(programs.id, programId))
      .returning();

    console.log("Storage: Program updated successfully:", updatedProgram?.id);
    return updatedProgram;
  }

  async deleteProgram(programId: number): Promise<void> {
    // Delete all workouts first
    await db.delete(workouts).where(eq(workouts.programId, programId));

    // Then delete the program
    await db.delete(programs).where(eq(programs.id, programId));
  }

  async updateWorkout(workoutId: number, updateData: any): Promise<any> {
    console.log("Storage: Updating workout", workoutId, "with data:", updateData);

    try {
      // Verify workout exists first
      const existingWorkout = await this.getWorkout(workoutId);
      if (!existingWorkout) {
        throw new Error("Workout not found");
      }

      // Prepare the update object
      const updateObject: any = {
        updatedAt: new Date()
      };

      // Only include fields that are actually provided and valid
      const validFields = ['name', 'description', 'week', 'day', 'duration', 'workoutType', 'exercises', 'estimatedDuration'];

      for (const field of validFields) {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          updateObject[field] = updateData[field];
        }
      }

      // Handle exercises field - ensure it's stored as JSON string in database
      if (updateData.exercises !== undefined) {
        if (typeof updateData.exercises === 'string') {
          // If it's already a string, validate it's valid JSON
          try {
            JSON.parse(updateData.exercises);
            updateObject.exercises = updateData.exercises;
          } catch (error) {
            console.error("Invalid exercises JSON string:", error);
            throw new Error("Invalid exercises JSON format");
          }
        } else if (Array.isArray(updateData.exercises) || (typeof updateData.exercises === 'object' && updateData.exercises !== null)) {
          // If it's an array or object, stringify it
          try {
            updateObject.exercises = JSON.stringify(updateData.exercises);
          } catch (error) {
            console.error("Error stringifying exercises:", error);
            throw new Error("Failed to serialize exercises data");
          }
        } else {
          // For any other type, don't include it in the update
          console.warn("Ignoring invalid exercises data type:", typeof updateData.exercises);
        }
      }

      console.log("Storage: Final update object:", updateObject);

      // Perform the update
      const [updatedWorkout] = await db
        .update(workouts)
        .set(updateObject)
        .where(eq(workouts.id, workoutId))
        .returning();

      if (!updatedWorkout) {
        throw new Error("Workout update failed - no result returned");
      }

      console.log("Storage: Successfully updated workout:", updatedWorkout.id);
      return updatedWorkout;
    } catch (error) {
      console.error("Storage: Error updating workout:", error);
      throw error;
    }
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
      
      // Find the next workout in chronological order
      workout = allWorkouts.find(w => 
        w.week > currentWeek || (w.week === currentWeek && w.day > currentDay)
      );
      
      // If still no workout found, start from the beginning
      if (!workout) {
        workout = allWorkouts[0];
        console.log(`No future workouts found, starting from beginning: Week ${workout?.week}, Day ${workout?.day}`);
        
        // Update progress to reflect the reset
        if (workout) {
          await this.updateUserProgress(userId, {
            currentWeek: workout.week,
            currentDay: workout.day
          });
        }
      } else {
        console.log(`Found next available workout: Week ${workout.week}, Day ${workout.day}`);
        
        // Update progress to reflect the found workout
        await this.updateUserProgress(userId, {
          currentWeek: workout.week,
          currentDay: workout.day
        });
      }
    } else {
      console.log(`Found exact workout: Week ${workout.week}, Day ${workout.day} - ${workout.name}`);
    }

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

  async getUserWorkoutCompletions(userId: string): Promise<WorkoutCompletion[]> {
    return await db
      .select()
      .from(workoutCompletions)
      .where(eq(workoutCompletions.userId, userId))
      .orderBy(desc(workoutCompletions.completedAt));
  }

  async createWorkoutCompletion(completion: InsertWorkoutCompletion): Promise<WorkoutCompletion> {
    const [newCompletion] = await db.insert(workoutCompletions).values(completion).returning();
    return newCompletion;
  }

  // Assessment operations
  async createAssessment(assessmentData: any): Promise<Assessment> {
    try {
      console.log("Creating assessment with data:", {
        userId: assessmentData.userId,
        hasData: !!assessmentData.data,
        dataLength: assessmentData.data?.length || 0,
        createdAt: assessmentData.createdAt
      });

      // Validate required fields
      if (!assessmentData.userId) {
        throw new Error("User ID is required for assessment");
      }

      // Ensure data field is a string
      if (assessmentData.data && typeof assessmentData.data !== 'string') {
        assessmentData.data = JSON.stringify(assessmentData.data);
      }

      // Validate all required fields are present
      const validatedData = {
        userId: assessmentData.userId,
        data: assessmentData.data || JSON.stringify({}),
        hyroxEventsCompleted: assessmentData.hyroxEventsCompleted ?? 0,
        generalFitnessYears: assessmentData.generalFitnessYears ?? 1,
        primaryTrainingBackground: assessmentData.primaryTrainingBackground || 'general',
        weeklyTrainingDays: assessmentData.weeklyTrainingDays ?? 3,
        avgSessionLength: assessmentData.avgSessionLength ?? 60,
        competitionFormat: assessmentData.competitionFormat || 'singles',
        age: assessmentData.age ?? 30,
        injuryHistory: assessmentData.injuryHistory ?? false,
        injuryRecent: assessmentData.injuryRecent ?? false,
        goals: assessmentData.goals || 'general-fitness',
        equipmentAccess: assessmentData.equipmentAccess || 'full_gym',
        bestFinishTime: assessmentData.bestFinishTime || null,
        kilometerRunTime: assessmentData.kilometerRunTime || null,
        squatMaxReps: assessmentData.squatMaxReps || null,
        createdAt: assessmentData.createdAt || new Date()
      };

      const result = await db.insert(assessments).values(validatedData).returning();

      if (!result[0]) {
        throw new Error("Assessment creation failed - no result returned");
      }

      console.log("Assessment created successfully:", result[0].id);
      return result[0];
    } catch (error) {
      console.error("Database error creating assessment:", error);
      throw error;
    }
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

  async updateUser(userId: string, updates: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }

  async createFailedPaymentRecord(failedPayment: {
    userId: string;
    invoiceId: string;
    attemptCount: number;
    amount: number;
    currency: string;
    failureReason: string;
    nextRetryAt: Date | null;
    createdAt: Date;
  }): Promise<void> {
    // In a real implementation, you'd have a failedPayments table
    // For now, we'll just log it
    console.log('Failed payment record created:', failedPayment);
  }

  async getFailedPayments(userId: string): Promise<any[]> {
    // In a real implementation, you'd query the failedPayments table
    // For now, return empty array
    return [];
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

  // Referral system methods
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));
    return user;
  }

  async getReferralByReferee(refereeId: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.refereeId, refereeId));
    return referral;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();
    return newReferral;
  }

  async updateUserReferredBy(userId: string, referralCode: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ referredBy: referralCode, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateReferralStatus(referralId: number, status: string, qualifiedAt?: Date): Promise<Referral> {
    const updateData: any = { status };
    if (qualifiedAt) {
      updateData.qualifiedAt = qualifiedAt;
    }

    const [referral] = await db
      .update(referrals)
      .set(updateData)
      .where(eq(referrals.id, referralId))
      .returning();
    return referral;
  }

  async updateReferralRewardClaimed(referralId: number, claimedAt: Date): Promise<Referral> {
    const [referral] = await db
      .update(referrals)
      .set({ 
        rewardClaimed: true, 
        rewardClaimedAt: claimedAt,
        status: 'rewarded'
      })
      .where(eq(referrals.id, referralId))
      .returning();
    return referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
  }

  async incrementUserFreeMonths(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        freeMonthsEarned: sql`${users.freeMonthsEarned} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Subscription system methods
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async addFreeMonthToSubscription(subscriptionId: number): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ 
        freeMonthsRemaining: sql`${subscriptions.freeMonthsRemaining} + 1`,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();
    return subscription;
  }

  async updateSubscriptionMonthsPaid(userId: string, monthsPaid: number): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ monthsPaid, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return subscription;
  }

  // Promo code operations
  async getPromoCodeByCode(code: string): Promise<(PromoCode & { uses?: PromoCodeUse[] }) | undefined> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase()));

    if (!promoCode) return undefined;

    // Get usage data for this promo code
    const uses = await this.getPromoCodeUses(promoCode.id);

    return {
      ...promoCode,
      uses
    };
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [newPromoCode] = await db
      .insert(promoCodes)
      .values({
        ...promoCode,
        code: promoCode.code.toUpperCase(),
      })
      .returning();
    return newPromoCode;
  }

  async updatePromoCode(id: number, updates: Partial<InsertPromoCode>): Promise<PromoCode> {
    const updateData = { ...updates, updatedAt: new Date() };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const [promoCode] = await db
      .update(promoCodes)
      .set(updateData)
      .where(eq(promoCodes.id, id))
      .returning();
    return promoCode;
  }

  async deletePromoCode(id: number): Promise<void> {
    // Delete usage records first
    await db.delete(promoCodeUses).where(eq(promoCodeUses.promoCodeId, id));
    // Then delete the promo code
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt));
  }

  async incrementPromoCodeUse(promoCodeId: number): Promise<PromoCode> {
    const [promoCode] = await db
      .update(promoCodes)
      .set({ 
        usesCount: sql`${promoCodes.usesCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promoCodes.id, promoCodeId))
      .returning();
    return promoCode;
  }

  async createPromoCodeUse(use: InsertPromoCodeUse): Promise<PromoCodeUse> {
    const [newUse] = await db
      .insert(promoCodeUses)
      .values(use)
      .returning();
    return newUse;
  }

  async getPromoCodeUses(promoCodeId: number): Promise<PromoCodeUse[]> {
    return await db
      .select()
      .from(promoCodeUses)
      .where(eq(promoCodeUses.promoCodeId, promoCodeId))
      .orderBy(desc(promoCodeUses.usedAt));
  }

  async hasUserUsedPromoCode(userId: string, promoCodeId: number): Promise<boolean> {
    const [use] = await db
      .select()
      .from(promoCodeUses)
      .where(
        and(
          eq(promoCodeUses.userId, userId),
          eq(promoCodeUses.promoCodeId, promoCodeId)
        )
      );
    return !!use;
  }

  async grantPromoFreeMonths(userId: string, months: number, expiresAt?: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        promoFreeMonthsRemaining: months,
        promoExpires: expiresAt,
        subscriptionStatus: "active", // Grant premium access
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();