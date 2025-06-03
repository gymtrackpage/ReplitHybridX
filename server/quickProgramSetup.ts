import { storage } from "./storage";

// Create minimal program setup for immediate functionality
export async function createMinimalPrograms() {
  const programs = [
    { name: "Beginner Program", difficulty: "beginner", category: "general" },
    { name: "Intermediate Program", difficulty: "intermediate", category: "general" },
    { name: "Advanced Program", difficulty: "advanced", category: "general" },
    { name: "Strength Program", difficulty: "intermediate", category: "strength" },
    { name: "Runner Program", difficulty: "intermediate", category: "running" },
    { name: "Doubles Program", difficulty: "intermediate", category: "doubles" }
  ];

  for (const programData of programs) {
    const program = await storage.createProgram({
      name: programData.name,
      description: `14-week ${programData.name.toLowerCase()} for HYROX training`,
      duration: 14,
      difficulty: programData.difficulty,
      frequency: 6,
      category: programData.category,
      targetEventWeeks: 14,
      isActive: true
    });

    // Create just Week 1 workouts to start
    for (let day = 1; day <= 6; day++) {
      await storage.createWorkout({
        programId: program.id,
        week: 1,
        day,
        name: `Week 1 Day ${day} - Training Session`,
        description: `Day ${day} training session focusing on HYROX movements and conditioning`,
        estimatedDuration: 60,
        exercises: JSON.stringify([
          { name: "Warm-up", sets: 1, reps: 1, duration: 10 },
          { name: "Main Training", sets: 4, reps: 10 },
          { name: "Cool-down", sets: 1, reps: 1, duration: 10 }
        ])
      });
    }
  }

  console.log("Created 6 programs with Week 1 workouts");
}