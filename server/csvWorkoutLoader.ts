import { storage } from "./storage";
import { readFileSync } from "fs";
import { join } from "path";

interface WorkoutData {
  week: number;
  day: number;
  name: string;
  description: string;
  duration: number;
  exercises: any[];
  difficulty: string;
}

export async function loadBeginnerProgramFromCSV() {
  try {
    // Find the beginner program in the database
    const programs = await storage.getPrograms();
    const beginnerProgram = programs.find(p => p.name === "Beginner Program");
    
    if (!beginnerProgram) {
      console.error("Beginner Program not found in database");
      return;
    }

    const csvPath = join(process.cwd(), "attached_assets", "Master Program Workouts - BeginnerProgram.csv");
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line - handle quoted fields with commas
      const fields = parseCSVLine(line);
      if (fields.length < 7) continue;
      
      const weekStr = fields[0];
      const weekMatch = weekStr.match(/(?:Wk|Week)\s*(\d+)/i);
      if (!weekMatch) continue;
      
      const week = parseInt(weekMatch[1]);
      
      // Create workouts for each day (Monday to Saturday, skip Sunday rest)
      const dayNames = [
        "Strength (Full Body A)",
        "Varied Quality Run", 
        "Metcon/WOD (Engine/Skill)",
        "Active Recovery / Mobility",
        "Strength (Full Body B + Hyrox Element)",
        "Longer Run / Hybrid WOD"
      ];
      
      for (let dayIndex = 0; dayIndex < 6; dayIndex++) {
        const dayNumber = dayIndex + 1;
        const workoutDescription = fields[dayIndex + 1];
        
        if (!workoutDescription || workoutDescription.toLowerCase().includes('rest')) {
          continue;
        }
        
        const workoutData: WorkoutData = {
          week,
          day: dayNumber,
          name: `Week ${week} Day ${dayNumber} - ${dayNames[dayIndex]}`,
          description: cleanWorkoutDescription(workoutDescription),
          duration: estimateDuration(workoutDescription),
          exercises: parseExercises(workoutDescription),
          difficulty: determineDifficulty(week, workoutDescription)
        };
        
        // Create workout in database
        await storage.createWorkout({
          programId: beginnerProgram.id,
          week: workoutData.week,
          day: workoutData.day,
          name: workoutData.name,
          description: workoutData.description,
          estimatedDuration: workoutData.duration,
          exercises: JSON.stringify(workoutData.exercises)
        });
        
        console.log(`Created workout: ${workoutData.name}`);
      }
    }
    
    console.log("Successfully loaded Beginner Program workouts from CSV");
  } catch (error) {
    console.error("Error loading workouts from CSV:", error);
  }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

function cleanWorkoutDescription(description: string): string {
  // Remove quotes and clean up formatting
  return description
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateDuration(description: string): number {
  // Extract duration from description or estimate based on content
  const durationMatch = description.match(/(\d+)\s*min/i);
  if (durationMatch) {
    return parseInt(durationMatch[1]);
  }
  
  // Estimate based on workout type
  if (description.toLowerCase().includes('run') && description.toLowerCase().includes('60-75')) {
    return 75;
  } else if (description.toLowerCase().includes('run') && description.toLowerCase().includes('45-60')) {
    return 60;
  } else if (description.toLowerCase().includes('run') && description.toLowerCase().includes('30-40')) {
    return 35;
  } else if (description.toLowerCase().includes('strength')) {
    return 45;
  } else if (description.toLowerCase().includes('metcon') || description.toLowerCase().includes('amrap')) {
    return 30;
  } else if (description.toLowerCase().includes('recovery') || description.toLowerCase().includes('mobility')) {
    return 25;
  } else {
    return 40; // Default
  }
}

function parseExercises(description: string): any[] {
  const exercises: any[] = [];
  
  // Extract exercise patterns
  const exercisePatterns = [
    /([A-Z][^:]+):\s*(\d+x\d+)/g, // Pattern like "Back Squats: 3x8"
    /(\d+)\s*x\s*(\d+)\s*([^.\n]+)/g, // Pattern like "3x8 Squats"
    /([A-Z][^:]+):\s*([^.\n]+)/g // General pattern
  ];
  
  exercisePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      exercises.push({
        name: match[1] || match[3] || 'Exercise',
        sets: extractSets(match[0]),
        reps: extractReps(match[0]),
        notes: match[0]
      });
    }
  });
  
  // If no exercises found, create a general one
  if (exercises.length === 0) {
    exercises.push({
      name: extractWorkoutType(description),
      sets: 1,
      reps: 1,
      notes: description.substring(0, 200)
    });
  }
  
  return exercises;
}

function extractSets(text: string): number {
  const match = text.match(/(\d+)x\d+/);
  return match ? parseInt(match[1]) : 1;
}

function extractReps(text: string): number {
  const match = text.match(/\d+x(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

function extractWorkoutType(description: string): string {
  if (description.toLowerCase().includes('run')) return 'Running';
  if (description.toLowerCase().includes('strength')) return 'Strength Training';
  if (description.toLowerCase().includes('metcon')) return 'Metcon';
  if (description.toLowerCase().includes('recovery')) return 'Recovery';
  if (description.toLowerCase().includes('hyrox')) return 'Hyrox Training';
  return 'General Workout';
}

function determineDifficulty(week: number, description: string): string {
  if (week <= 4) return 'beginner';
  if (week <= 8) return 'intermediate';
  if (week <= 12) return 'advanced';
  return 'peak';
}