import { storage } from "./storage";

// Generate complete 14-week programs with sample workouts
export async function loadBasicHyroxPrograms() {
  const programs = [
    {
      name: "Beginner Program",
      description: "14-week beginner HYROX program focusing on building base fitness",
      difficulty: "beginner",
      targetEventWeeks: 14,
      category: "general"
    },
    {
      name: "Intermediate Program", 
      description: "14-week intermediate HYROX program with balanced training",
      difficulty: "intermediate",
      targetEventWeeks: 14,
      category: "general"
    },
    {
      name: "Advanced Program",
      description: "14-week advanced HYROX program with high-intensity training",
      difficulty: "advanced", 
      targetEventWeeks: 14,
      category: "general"
    },
    {
      name: "Strength Program",
      description: "14-week strength-focused HYROX program",
      difficulty: "intermediate",
      targetEventWeeks: 14,
      category: "strength"
    },
    {
      name: "Runner Program",
      description: "14-week runner-focused HYROX program",
      difficulty: "intermediate",
      targetEventWeeks: 14,
      category: "running"
    },
    {
      name: "Doubles Program",
      description: "14-week partner/doubles HYROX program",
      difficulty: "intermediate",
      targetEventWeeks: 14,
      category: "doubles"
    }
  ];

  for (const programData of programs) {
    // Create program
    const program = await storage.createProgram({
      name: programData.name,
      description: programData.description,
      duration: programData.targetEventWeeks,
      difficulty: programData.difficulty,
      frequency: 6,
      category: programData.category,
      targetEventWeeks: programData.targetEventWeeks,
      isActive: true
    });

    console.log(`Created program: ${program.name}`);

    // Create workouts for 14 weeks, 6 days per week
    for (let week = 1; week <= 14; week++) {
      for (let day = 1; day <= 6; day++) {
        const dayName = getDayName(day);
        const workoutType = getWorkoutType(day, programData.difficulty);
        
        await storage.createWorkout({
          programId: program.id,
          week,
          day,
          name: `Week ${week} Day ${day} - ${dayName}`,
          description: generateWorkoutDescription(week, day, workoutType, programData.category),
          estimatedDuration: getEstimatedDuration(workoutType),
          exercises: JSON.stringify(generateExercises(workoutType, programData.category))
        });
      }
    }

    console.log(`Loaded ${14 * 6} workouts for ${program.name}`);
  }
}

function getDayName(day: number): string {
  const dayNames = [
    "Long Intervals",
    "Strength Training", 
    "Tempo Run",
    "Strength Training",
    "Shorter Intervals",
    "Long Run"
  ];
  return dayNames[day - 1] || "Training";
}

function getWorkoutType(day: number, difficulty: string): string {
  const workoutTypes = [
    "intervals",
    "strength", 
    "tempo",
    "strength",
    "intervals",
    "endurance"
  ];
  return workoutTypes[day - 1] || "general";
}

function generateWorkoutDescription(week: number, day: number, type: string, category: string): string {
  const intensity = week <= 4 ? "moderate" : week <= 10 ? "high" : "peak";
  
  switch (type) {
    case "intervals":
      return `${intensity} intensity interval training with focus on HYROX-specific movements`;
    case "strength":
      return `Full body strength training targeting functional movements and HYROX stations`;
    case "tempo":
      return `Tempo run at sustained pace to build aerobic capacity`;
    case "endurance":
      return `Long steady-state cardio session for aerobic base development`;
    default:
      return `HYROX-specific training session focusing on ${category} development`;
  }
}

function getEstimatedDuration(type: string): number {
  switch (type) {
    case "intervals":
      return 45;
    case "strength":
      return 60;
    case "tempo":
      return 40;
    case "endurance":
      return 90;
    default:
      return 50;
  }
}

function generateExercises(type: string, category: string): any[] {
  const baseExercises = [
    { name: "Warm-up", sets: 1, reps: 1, duration: 10 },
    { name: "Cool-down", sets: 1, reps: 1, duration: 10 }
  ];

  switch (type) {
    case "intervals":
      return [
        ...baseExercises,
        { name: "Running Intervals", sets: 6, reps: 1, duration: 3 },
        { name: "SkiErg", sets: 4, reps: 250, unit: "meters" },
        { name: "Burpee Broad Jumps", sets: 4, reps: 10 }
      ];
    case "strength":
      return [
        ...baseExercises,
        { name: "Squats", sets: 4, reps: 8 },
        { name: "Deadlifts", sets: 4, reps: 6 },
        { name: "Overhead Press", sets: 3, reps: 8 },
        { name: "Pull-ups", sets: 3, reps: 10 }
      ];
    default:
      return baseExercises;
  }
}