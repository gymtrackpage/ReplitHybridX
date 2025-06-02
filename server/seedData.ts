import { db } from "./db";
import { programs, workouts } from "@shared/schema";

export async function seedHyroxPrograms() {
  try {
    // Create Hyrox training programs
    const hyroxPrograms = [
      {
        name: "Hyrox Beginner (12 Week)",
        description: "A comprehensive 12-week program designed for first-time Hyrox participants. Focuses on building base fitness, movement patterns, and race-specific skills.",
        duration: 12,
        difficulty: "beginner",
        frequency: 4,
        category: "hyrox",
        targetEventWeeks: 12,
      },
      {
        name: "Hyrox Intermediate (16 Week)",
        description: "Intermediate program for athletes with some functional fitness experience. Builds strength and conditioning for competitive Hyrox performance.",
        duration: 16,
        difficulty: "intermediate",
        frequency: 5,
        category: "hyrox",
        targetEventWeeks: 16,
      },
      {
        name: "Hyrox Advanced (20 Week)",
        description: "Advanced periodized program for experienced athletes targeting elite Hyrox performance. Includes competition simulation and peak phases.",
        duration: 20,
        difficulty: "advanced",
        frequency: 6,
        category: "hyrox",
        targetEventWeeks: 20,
      },
      {
        name: "Hyrox Express (8 Week)",
        description: "Condensed 8-week program for athletes with limited preparation time. High-intensity approach to race readiness.",
        duration: 8,
        difficulty: "intermediate",
        frequency: 5,
        category: "hyrox",
        targetEventWeeks: 8,
      },
    ];

    const insertedPrograms = await db.insert(programs).values(hyroxPrograms).returning();
    console.log("Created Hyrox programs:", insertedPrograms.length);

    // Create sample workouts for the beginner program
    const beginnerProgram = insertedPrograms.find(p => p.name.includes("Beginner"));
    if (beginnerProgram) {
      const sampleWorkouts = [
        {
          name: "Base Building Run + Sled Push",
          description: "30min steady run + 8x50m sled push (bodyweight). Focus on pacing and technique.",
          programId: beginnerProgram.id,
          week: 1,
          day: 1,
          duration: 45,
          exercises: JSON.stringify([
            { name: "Warm-up", sets: 1, reps: "10min", weight: null },
            { name: "Steady Run", sets: 1, reps: "30min", weight: null },
            { name: "Sled Push", sets: 8, reps: "50m", weight: "bodyweight" },
            { name: "Cool-down", sets: 1, reps: "5min", weight: null }
          ]),
          difficulty: "moderate",
        },
        {
          name: "Functional Strength Circuit",
          description: "Full body strength circuit focusing on Hyrox movement patterns.",
          programId: beginnerProgram.id,
          week: 1,
          day: 2,
          duration: 50,
          exercises: JSON.stringify([
            { name: "Warm-up", sets: 1, reps: "10min", weight: null },
            { name: "Burpee Broad Jumps", sets: 4, reps: "8", weight: null },
            { name: "KB Farmers Carry", sets: 4, reps: "40m", weight: "20kg each" },
            { name: "Wall Balls", sets: 4, reps: "15", weight: "9kg" },
            { name: "Sandbag Lunges", sets: 4, reps: "20", weight: "20kg" },
            { name: "Rowing", sets: 4, reps: "250m", weight: null }
          ]),
          difficulty: "moderate",
        },
        {
          name: "Running Intervals + SkiErg",
          description: "Speed endurance work with Hyrox stations.",
          programId: beginnerProgram.id,
          week: 1,
          day: 3,
          duration: 40,
          exercises: JSON.stringify([
            { name: "Warm-up", sets: 1, reps: "10min", weight: null },
            { name: "Run Intervals", sets: 6, reps: "400m", weight: "90sec rest" },
            { name: "SkiErg", sets: 1, reps: "1000m", weight: null },
            { name: "Cool-down", sets: 1, reps: "10min", weight: null }
          ]),
          difficulty: "moderate",
        },
        {
          name: "Hyrox Simulation (Half Distance)",
          description: "Practice race format with half distances to build familiarity.",
          programId: beginnerProgram.id,
          week: 1,
          day: 4,
          duration: 60,
          exercises: JSON.stringify([
            { name: "Run", sets: 1, reps: "500m", weight: null },
            { name: "SkiErg", sets: 1, reps: "500m", weight: null },
            { name: "Run", sets: 1, reps: "500m", weight: null },
            { name: "Sled Push", sets: 1, reps: "25m", weight: "bodyweight+20kg" },
            { name: "Run", sets: 1, reps: "500m", weight: null },
            { name: "Sled Pull", sets: 1, reps: "25m", weight: "bodyweight+20kg" },
            { name: "Run", sets: 1, reps: "500m", weight: null },
            { name: "Burpee Broad Jumps", sets: 1, reps: "40", weight: null }
          ]),
          difficulty: "hard",
        },
      ];

      await db.insert(workouts).values(sampleWorkouts);
      console.log("Created sample workouts for beginner program");
    }

    return insertedPrograms;
  } catch (error) {
    console.error("Error seeding Hyrox programs:", error);
    throw error;
  }
}