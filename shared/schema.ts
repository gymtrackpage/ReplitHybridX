import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("none"), // none, active, cancelled, subscribe_later
  stravaUserId: varchar("strava_user_id"),
  stravaAccessToken: varchar("strava_access_token"),
  stravaRefreshToken: varchar("strava_refresh_token"),
  stravaTokenExpiry: timestamp("strava_token_expiry"),
  stravaConnected: boolean("strava_connected").default(false),
  isAdmin: boolean("is_admin").default(false),
  currentProgramId: integer("current_program_id"),
  fitnessLevel: varchar("fitness_level"), // beginner, intermediate, advanced
  assessmentCompleted: boolean("assessment_completed").default(false),
  streak: integer("streak").default(0),
  totalWorkouts: integer("total_workouts").default(0),
  hyroxEventDate: timestamp("hyrox_event_date"),
  hyroxEventLocation: varchar("hyrox_event_location"),
  targetTime: varchar("target_time"),
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"), // referral code of the person who referred this user
  freeMonthsEarned: integer("free_months_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hyrox training programs table
export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  duration: integer("duration"), // weeks
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  frequency: integer("frequency"), // workouts per week
  category: varchar("category").default("hyrox"), // hyrox, strength, conditioning
  racecategory: varchar("racecategory").default("Singles"), // Singles, Doubles/Relay
  targetEventWeeks: integer("target_event_weeks"), // weeks until event
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workouts within programs
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  week: integer("week").notNull(),
  day: integer("day").notNull(),
  estimatedDuration: integer("estimated_duration"), // minutes
  exercises: jsonb("exercises").notNull(), // Array of exercise objects
  createdAt: timestamp("created_at").defaultNow(),
});

// User progress tracking
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  programId: integer("program_id").notNull(),
  currentWeek: integer("current_week").default(1),
  currentDay: integer("current_day").default(1),
  completedWorkouts: integer("completed_workouts").default(0),
  totalWorkouts: integer("total_workouts").default(0),
  startDate: varchar("start_date"),
  lastWorkoutDate: date("last_workout_date"),
  eventDate: varchar("event_date"), // Store as string for compatibility
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual workout completions
export const workoutCompletions = pgTable("workout_completions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  workoutId: integer("workout_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  duration: integer("duration"), // actual duration in minutes
  notes: text("notes"),
  rating: integer("rating"), // 1-5 rating scale
  skipped: boolean("skipped").default(false), // track if workout was skipped
  exerciseData: jsonb("exercise_data"), // completed sets, reps, weights
});

// User assessments
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  fitnessLevel: varchar("fitness_level"),
  goals: jsonb("goals"),
  experience: varchar("experience"),
  timeAvailability: integer("time_availability"), // minutes per workout
  equipmentAccess: jsonb("equipment_access"),
  data: jsonb("data"), // Store complete HYROX assessment data
  completedAt: timestamp("completed_at").defaultNow(),
});

// User weight tracking
export const weightEntries = pgTable("weight_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  unit: varchar("unit").default("lbs"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Referral system tables
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull(), // User who made the referral
  refereeId: varchar("referee_id").notNull(), // User who was referred
  referralCode: varchar("referral_code").notNull(),
  status: varchar("status").default("pending"), // pending, qualified, rewarded
  rewardClaimed: boolean("reward_claimed").default(false),
  qualifiedAt: timestamp("qualified_at"), // When referee completed 2 months
  rewardClaimedAt: timestamp("reward_claimed_at"), // When referrer got free month
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(),
  status: varchar("status").notNull(), // active, cancelled, past_due, unpaid
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  monthsPaid: integer("months_paid").default(0),
  freeMonthsRemaining: integer("free_months_remaining").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  currentProgram: one(programs, {
    fields: [users.currentProgramId],
    references: [programs.id],
  }),
  progress: many(userProgress),
  completions: many(workoutCompletions),
  assessments: many(assessments),
  weightEntries: many(weightEntries),
  referralsMade: many(referrals, { relationName: "referrer" }),
  subscription: one(subscriptions),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  workouts: many(workouts),
  userProgress: many(userProgress),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  program: one(programs, {
    fields: [workouts.programId],
    references: [programs.id],
  }),
  completions: many(workoutCompletions),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  program: one(programs, {
    fields: [userProgress.programId],
    references: [programs.id],
  }),
}));

export const workoutCompletionsRelations = relations(workoutCompletions, ({ one }) => ({
  user: one(users, {
    fields: [workoutCompletions.userId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [workoutCompletions.workoutId],
    references: [workouts.id],
  }),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
}));

export const weightEntriesRelations = relations(weightEntries, ({ one }) => ({
  user: one(users, {
    fields: [weightEntries.userId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referee: one(users, {
    fields: [referrals.refereeId],
    references: [users.id],
    relationName: "referee",
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertProgramSchema = createInsertSchema(programs);
export const insertWorkoutSchema = createInsertSchema(workouts);
export const insertUserProgressSchema = createInsertSchema(userProgress);
export const insertWorkoutCompletionSchema = createInsertSchema(workoutCompletions);
export const insertAssessmentSchema = createInsertSchema(assessments);
export const insertWeightEntrySchema = createInsertSchema(weightEntries);
export const insertReferralSchema = createInsertSchema(referrals);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type WorkoutCompletion = typeof workoutCompletions.$inferSelect;
export type InsertWorkoutCompletion = z.infer<typeof insertWorkoutCompletionSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type WeightEntry = typeof weightEntries.$inferSelect;
export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Additional interface for API responses
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ProgramWithWorkouts extends Program {
  workouts: Workout[];
  workoutCount: number;
}

export interface UserWithProgress extends User {
  progress?: UserProgress;
  completions?: WorkoutCompletion[];
}
