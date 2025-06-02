import { db } from "./db";
import { programs, workouts } from "@shared/schema";
import fs from 'fs';
import path from 'path';

interface WorkoutData {
  week: number;
  day: number;
  name: string;
  description: string;
  duration: number;
  exercises: any[];
  difficulty: string;
}

export async function loadProgramsFromCSV() {
  try {
    console.log("Loading HYROX programs from CSV files...");
    
    // Define all program files that should be loaded
    const programFiles = [
      { file: 'BeginnerProgram.csv', id: 'BeginnerProgram', type: 'main' },
      { file: 'IntermediateProgram.csv', id: 'IntermediateProgram', type: 'main' },
      { file: 'AdvancedProgram.csv', id: 'AdvancedProgram', type: 'main' },
      { file: 'RunnerProgram.csv', id: 'RunnerProgram', type: 'specialty' },
      { file: 'StrengthProgram.csv', id: 'StrengthProgram', type: 'specialty' },
      { file: 'DoublesProgram.csv', id: 'DoublesProgram', type: 'main' },
      { file: 'prepRunning.csv', id: 'prepRunning', type: 'prep' },
      { file: 'prepStrong.csv', id: 'prepStrong', type: 'prep' },
      { file: 'prepHyrox.csv', id: 'prepHyrox', type: 'prep' },
      { file: 'MaintainRunning.csv', id: 'MaintainRunning', type: 'maintenance' },
      { file: 'MaintainStrength.csv', id: 'MaintainStrength', type: 'maintenance' },
      { file: 'MaintainHyrox.csv', id: 'MaintainHyrox', type: 'maintenance' }
    ];

    // Create programs first
    const programsToCreate = [
      {
        name: "Complete Beginner 14-Week Program",
        description: "Perfect for those new to HYROX or structured training. Builds foundational fitness over 14 weeks.",
        duration: 14,
        difficulty: "beginner",
        frequency: 6,
        category: "hyrox",
        targetEventWeeks: 14,
        programType: "main"
      },
      {
        name: "Intermediate Performance 14-Week Program", 
        description: "For those with some HYROX experience or a good fitness base looking to improve performance.",
        duration: 14,
        difficulty: "intermediate",
        frequency: 6,
        category: "hyrox",
        targetEventWeeks: 14,
        programType: "main"
      },
      {
        name: "Advanced Competitor 14-Week Program",
        description: "Designed for experienced HYROX athletes aiming for competitive times and podium finishes.",
        duration: 14,
        difficulty: "advanced", 
        frequency: 6,
        category: "hyrox",
        targetEventWeeks: 14,
        programType: "main"
      },
      {
        name: "HYROX Runner Specialty Program",
        description: "4-week specialty program to improve running capacity and speed for HYROX.",
        duration: 4,
        difficulty: "intermediate",
        frequency: 5,
        category: "running",
        targetEventWeeks: 4,
        programType: "specialty"
      },
      {
        name: "HYROX Strength Specialty Program",
        description: "4-week specialty program to improve strength and power for HYROX stations.",
        duration: 4,
        difficulty: "intermediate",
        frequency: 5,
        category: "strength",
        targetEventWeeks: 4,
        programType: "specialty"
      },
      {
        name: "HYROX Doubles/Relay Program",
        description: "14-week program tailored for HYROX Doubles and Relay competitions.",
        duration: 14,
        difficulty: "intermediate",
        frequency: 6,
        category: "hyrox",
        targetEventWeeks: 14,
        programType: "main"
      },
      {
        name: "Prep Running Program",
        description: "4-week preparation cycle focusing on running development before main program.",
        duration: 4,
        difficulty: "beginner",
        frequency: 4,
        category: "prep",
        targetEventWeeks: 4,
        programType: "prep"
      },
      {
        name: "Prep Strength Program", 
        description: "4-week preparation cycle focusing on strength development before main program.",
        duration: 4,
        difficulty: "beginner",
        frequency: 4,
        category: "prep",
        targetEventWeeks: 4,
        programType: "prep"
      },
      {
        name: "Prep HYROX Program",
        description: "4-week preparation cycle focusing on HYROX movement patterns before main program.",
        duration: 4,
        difficulty: "beginner",
        frequency: 4,
        category: "prep",
        targetEventWeeks: 4,
        programType: "prep"
      },
      {
        name: "Maintain Running Program",
        description: "4-week maintenance cycle to sustain running fitness post-event.",
        duration: 4,
        difficulty: "beginner",
        frequency: 4,
        category: "maintenance",
        targetEventWeeks: 4,
        programType: "maintenance"
      },
      {
        name: "Maintain Strength Program",
        description: "4-week maintenance cycle to sustain strength levels post-event.",
        duration: 4,
        difficulty: "beginner", 
        frequency: 4,
        category: "maintenance",
        targetEventWeeks: 4,
        programType: "maintenance"
      },
      {
        name: "Maintain HYROX Program",
        description: "4-week maintenance cycle to sustain overall HYROX fitness post-event.",
        duration: 4,
        difficulty: "beginner",
        frequency: 4,
        category: "maintenance",
        targetEventWeeks: 4,
        programType: "maintenance"
      }
    ];

    // Insert programs and get IDs
    const insertedPrograms = await db.insert(programs).values(programsToCreate).returning();
    console.log(`Created ${insertedPrograms.length} programs`);

    // Process the BeginnerProgram CSV that was provided
    const beginnerProgram = insertedPrograms.find(p => p.name.includes("Beginner"));
    if (beginnerProgram) {
      await loadBeginnerProgramWorkouts(beginnerProgram.id);
    }

    return insertedPrograms;
  } catch (error) {
    console.error("Error loading programs from CSV:", error);
    throw error;
  }
}

async function loadBeginnerProgramWorkouts(programId: number) {
  try {
    // Parse the BeginnerProgram CSV data directly
    const csvData = `Week,Day 1 (Mon) - Strength (Full Body A),Day 2 (Tue) - Varied Quality Run,Day 3 (Wed) - Metcon/WOD (Engine/Skill),Day 4 (Thu) - Active Recovery / Mobility,Day 5 (Fri) - Strength (Full Body B + Hyrox Element),Day 6 (Sat) - Longer Run / Hybrid WOD,Day 7 (Sun) - Rest
Wk 1: Deload & Fun,"30 minute easy run @ RPE 4 (conversational pace. 
 10 min Cool down with dynamic movements and stretches","Run: 30-40 min Easy (RPE 4-5) with 4-6x20s ""fun"" sprints/pick-ups, full jog recovery.","Metcon (AMRAP 12 min): 
 5 Cal Row/Ski/Bike 
 7 KB Swings (Light-Mod) 
 9 Air Squats. 
 Focus: Smooth movement, not max intensity.","20-30 min Walk, Yoga, Full Body Foam Roll.","Warm-up: Dynamic. 
 A. RDLs (DBs or BB): 3x10-12 (RPE 6-7) 
 B. DB Overhead Press: 3x10-12 
 C. Walking Lunges: 2x10/leg 
 D. Farmer's Carry (Light, focus on posture): 2x30m. 
 Cool-down: Static.","Run: 45-60 min Easy (RPE 4-5) on a new/enjoyable route. OR Light Hybrid: 2 Rds: 400m Run, 10 Burpees, 15 Sit-ups.",Rest. Focus on enjoyment of movement.`;

    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    
    const workoutsToInsert: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      const weekInfo = row[0];
      
      // Extract week number
      const weekMatch = weekInfo.match(/Wk (\d+)/);
      const week = weekMatch ? parseInt(weekMatch[1]) : i;
      
      // Create workouts for each day (Days 1-7)
      for (let dayIndex = 1; dayIndex < 8; dayIndex++) {
        const workoutContent = row[dayIndex] || "Rest";
        
        if (workoutContent && workoutContent.trim() !== "" && !workoutContent.toLowerCase().includes("rest")) {
          const dayName = getDayName(dayIndex);
          const workoutName = extractWorkoutName(headers[dayIndex], workoutContent);
          
          workoutsToInsert.push({
            name: workoutName,
            description: workoutContent.trim(),
            programId: programId,
            week: week,
            day: dayIndex,
            duration: estimateDuration(workoutContent),
            exercises: JSON.stringify(parseExercises(workoutContent)),
            difficulty: determineDifficulty(week, workoutContent),
          });
        }
      }
    }
    
    if (workoutsToInsert.length > 0) {
      await db.insert(workouts).values(workoutsToInsert);
      console.log(`Created ${workoutsToInsert.length} workouts for Beginner Program`);
    }
    
  } catch (error) {
    console.error("Error loading beginner program workouts:", error);
    throw error;
  }
}

function getDayName(dayIndex: number): string {
  const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days[dayIndex] || `Day ${dayIndex}`;
}

function extractWorkoutName(header: string, content: string): string {
  // Extract workout type from header
  const headerMatch = header.match(/Day \d+ \([^)]+\) - (.+)/);
  if (headerMatch) {
    return headerMatch[1].trim();
  }
  
  // Fallback to content-based name
  if (content.includes("Run")) return "Running Workout";
  if (content.includes("Strength")) return "Strength Training";
  if (content.includes("Metcon")) return "Metabolic Conditioning";
  if (content.includes("Recovery")) return "Active Recovery";
  if (content.includes("Hyrox")) return "HYROX Training";
  
  return "Training Session";
}

function estimateDuration(content: string): number {
  // Look for time indicators in the content
  const timeMatches = content.match(/(\d+)[-\s]?min/gi);
  if (timeMatches) {
    const times = timeMatches.map(match => parseInt(match.match(/\d+/)?.[0] || "0"));
    return Math.max(...times);
  }
  
  // Default estimates based on content type
  if (content.includes("AMRAP") || content.includes("EMOM")) return 20;
  if (content.includes("Run") && content.includes("min")) return 45;
  if (content.includes("Recovery")) return 30;
  if (content.includes("Rest")) return 0;
  
  return 45; // Default duration
}

function parseExercises(content: string): any[] {
  const exercises: any[] = [];
  
  // Look for exercise patterns
  const exercisePatterns = [
    /(\d+)\s*x\s*(\d+[-\d]*)\s*([^.\n]+)/g, // 3x10 pattern
    /(\d+)\s*Cal\s*([^.\n]+)/g, // Calorie pattern
    /(\d+)m\s*([^.\n]+)/g, // Distance pattern
  ];
  
  exercisePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      exercises.push({
        name: match[3]?.trim() || match[2]?.trim() || "Exercise",
        sets: match[1] || "1",
        reps: match[2] || "1", 
        weight: null
      });
    }
  });
  
  // If no specific exercises found, create a general description
  if (exercises.length === 0 && !content.toLowerCase().includes("rest")) {
    exercises.push({
      name: "Workout Session",
      sets: "1",
      reps: "Complete as described",
      weight: null
    });
  }
  
  return exercises;
}

function determineDifficulty(week: number, content: string): string {
  if (week <= 2) return "easy";
  if (week <= 8) return "moderate";
  if (content.includes("AMRAP") || content.includes("max")) return "hard";
  if (content.includes("easy") || content.includes("light")) return "easy";
  return "moderate";
}

export async function calculateProgramSchedule(userId: string, programId: number, eventDate: Date | null) {
  try {
    const program = await db.query.programs.findFirst({
      where: (programs, { eq }) => eq(programs.id, programId)
    });
    
    if (!program) {
      throw new Error("Program not found");
    }
    
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    let programPhase = "MAIN";
    let startDate = new Date(currentDate);
    let currentWeek = 1;
    let currentDay = 1;
    
    if (eventDate) {
      const eventDateTime = new Date(eventDate);
      eventDateTime.setHours(0, 0, 0, 0);
      
      const daysUntilEvent = Math.floor((eventDateTime.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const programDurationDays = (program.duration || 14) * 7;
      
      if (daysUntilEvent < 0) {
        // Event has passed - put user in maintenance
        programPhase = "MAINTENANCE";
      } else if (daysUntilEvent < programDurationDays) {
        // Event is within program duration - start main program in progress
        programPhase = "MAIN";
        const daysIntoProgram = programDurationDays - daysUntilEvent;
        currentWeek = Math.floor(daysIntoProgram / 7) + 1;
        currentDay = (daysIntoProgram % 7) + 1;
        
        // Adjust start date backwards
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - daysIntoProgram);
      } else {
        // Event is far away - start with prep phase
        programPhase = "PREP";
      }
    }
    
    return {
      programPhase,
      startDate,
      currentWeek,
      currentDay,
      eventDate
    };
  } catch (error) {
    console.error("Error calculating program schedule:", error);
    throw error;
  }
}