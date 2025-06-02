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
}

interface ProgramConfig {
  csvFile: string;
  programName: string;
  description: string;
  difficulty: string;
  targetEventWeeks: number;
  category: string;
}

const PROGRAM_CONFIGS: ProgramConfig[] = [
  {
    csvFile: "Master Program Workouts - BeginnerProgram.csv",
    programName: "Beginner Program",
    description: "14-week beginner-friendly HYROX training program focusing on building base fitness and introducing HYROX movements",
    difficulty: "beginner",
    targetEventWeeks: 14,
    category: "general"
  },
  {
    csvFile: "Master Program Workouts - IntermediateProgram.csv", 
    programName: "Intermediate Program",
    description: "14-week intermediate HYROX program with increased intensity and power endurance focus",
    difficulty: "intermediate",
    targetEventWeeks: 14,
    category: "general"
  },
  {
    csvFile: "Master Program Workouts - AdvancedProgram.csv",
    programName: "Advanced Program", 
    description: "14-week advanced HYROX program with high-intensity intervals and race-specific simulations",
    difficulty: "advanced",
    targetEventWeeks: 14,
    category: "general"
  },
  {
    csvFile: "Master Program Workouts - StrengthProgram.csv",
    programName: "Strength Program",
    description: "14-week strength-focused HYROX program emphasizing heavy lifting and strength endurance",
    difficulty: "intermediate", 
    targetEventWeeks: 14,
    category: "strength"
  },
  {
    csvFile: "Master Program Workouts - RunnerProgram.csv",
    programName: "Runner Program",
    description: "14-week runner-focused HYROX program with emphasis on running performance and endurance",
    difficulty: "intermediate",
    targetEventWeeks: 14, 
    category: "running"
  },
  {
    csvFile: "Master Program Workouts - DoublesProgram.csv",
    programName: "Doubles Program",
    description: "14-week partner/doubles HYROX program with team coordination and communication focus",
    difficulty: "intermediate",
    targetEventWeeks: 14,
    category: "doubles"
  }
];

export async function loadAllHyroxPrograms() {
  try {
    console.log("Loading all HYROX programs from CSV files...");
    
    for (const config of PROGRAM_CONFIGS) {
      await loadProgramFromCSV(config);
    }
    
    console.log("Successfully loaded all HYROX programs");
  } catch (error) {
    console.error("Error loading programs:", error);
  }
}

async function loadProgramFromCSV(config: ProgramConfig) {
  try {
    // Check if program already exists
    const existingPrograms = await storage.getPrograms();
    const existingProgram = existingPrograms.find(p => p.name === config.programName);
    
    let program;
    if (existingProgram) {
      console.log(`Program "${config.programName}" already exists, updating...`);
      program = existingProgram;
    } else {
      // Create the program
      program = await storage.createProgram({
        name: config.programName,
        description: config.description,
        duration: config.targetEventWeeks,
        difficulty: config.difficulty,
        frequency: 6, // 6 days per week
        category: config.category,
        targetEventWeeks: config.targetEventWeeks,
        isActive: true
      });
      console.log(`Created program: ${config.programName}`);
    }

    // Load workouts from CSV
    const csvPath = join(process.cwd(), "attached_assets", config.csvFile);
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Parse header to get day names
    const headerLine = lines[0];
    const dayColumns = parseCSVLine(headerLine).slice(1); // Skip week column
    
    // Skip header row and process workout data
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = parseCSVLine(line);
      if (fields.length < 7) continue;
      
      const weekStr = fields[0];
      const weekMatch = weekStr.match(/(?:Wk|Week)\s*(\d+)/i);
      if (!weekMatch) continue;
      
      const week = parseInt(weekMatch[1]);
      
      // Create workouts for each day (skip Sunday rest day)
      for (let dayIndex = 0; dayIndex < Math.min(6, dayColumns.length); dayIndex++) {
        const dayNumber = dayIndex + 1;
        const workoutDescription = fields[dayIndex + 1];
        
        if (!workoutDescription || workoutDescription.toLowerCase().includes('rest')) {
          continue;
        }
        
        const dayName = extractDayName(dayColumns[dayIndex]);
        const workoutData: WorkoutData = {
          week,
          day: dayNumber,
          name: `Week ${week} Day ${dayNumber} - ${dayName}`,
          description: cleanWorkoutDescription(workoutDescription),
          duration: estimateDuration(workoutDescription),
          exercises: parseExercises(workoutDescription)
        };
        
        // Check if workout already exists
        const existingWorkouts = await storage.getWorkoutsByProgram(program.id);
        const existingWorkout = existingWorkouts.find(w => w.week === week && w.day === dayNumber);
        
        if (!existingWorkout) {
          // Create workout in database
          await storage.createWorkout({
            programId: program.id,
            week: workoutData.week,
            day: workoutData.day,
            name: workoutData.name,
            description: workoutData.description,
            estimatedDuration: workoutData.duration,
            exercises: JSON.stringify(workoutData.exercises)
          });
        }
      }
    }
    
    console.log(`Loaded workouts for ${config.programName}`);
  } catch (error) {
    console.error(`Error loading ${config.programName}:`, error);
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

function extractDayName(columnHeader: string): string {
  // Extract the workout type from column headers like "Day 1 (Mon) - Strength (Full Body A)"
  const match = columnHeader.match(/Day \d+ \([^)]+\) - (.+)/);
  if (match) {
    return match[1].trim();
  }
  
  // Fallback patterns
  if (columnHeader.toLowerCase().includes('strength')) return 'Strength Training';
  if (columnHeader.toLowerCase().includes('run')) return 'Running';
  if (columnHeader.toLowerCase().includes('tempo')) return 'Tempo Run';
  if (columnHeader.toLowerCase().includes('interval')) return 'Interval Training';
  if (columnHeader.toLowerCase().includes('recovery')) return 'Active Recovery';
  if (columnHeader.toLowerCase().includes('hyrox')) return 'Hyrox Training';
  if (columnHeader.toLowerCase().includes('compromised')) return 'Compromised Running';
  
  return 'General Workout';
}

function cleanWorkoutDescription(description: string): string {
  return description
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateDuration(description: string): number {
  // Extract duration from description
  const durationMatch = description.match(/(\d+)\s*min/i);
  if (durationMatch) {
    return parseInt(durationMatch[1]);
  }
  
  // Estimate based on workout content
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('90-120') || lowerDesc.includes('120-150')) return 120;
  if (lowerDesc.includes('75-90') || lowerDesc.includes('90-100')) return 90;
  if (lowerDesc.includes('60-75') || lowerDesc.includes('75 min')) return 75;
  if (lowerDesc.includes('45-60') || lowerDesc.includes('60 min')) return 60;
  if (lowerDesc.includes('30-40') || lowerDesc.includes('40 min')) return 40;
  if (lowerDesc.includes('20-30') || lowerDesc.includes('30 min')) return 30;
  
  if (lowerDesc.includes('long run') || lowerDesc.includes('longer run')) return 90;
  if (lowerDesc.includes('strength') && lowerDesc.includes('full body')) return 50;
  if (lowerDesc.includes('tempo') || lowerDesc.includes('threshold')) return 45;
  if (lowerDesc.includes('interval') || lowerDesc.includes('speed')) return 40;
  if (lowerDesc.includes('recovery') || lowerDesc.includes('rest')) return 25;
  if (lowerDesc.includes('hyrox') && lowerDesc.includes('simulation')) return 60;
  
  return 45; // Default
}

function parseExercises(description: string): any[] {
  const exercises: any[] = [];
  
  // Common exercise patterns
  const patterns = [
    /([A-Za-z\s]+):\s*(\d+x\d+)/g,
    /(\d+)\s*x\s*(\d+)\s*([A-Za-z\s]+)/g,
    /(Back Squat|Front Squat|Deadlift|Bench Press|Pull-ups?|Push-ups?|Wall Ball|Sled Push|Sled Pull|Farmer's Carry|KB Swings?|Burpees?)/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const exerciseName = match[1] || match[3] || match[0];
      exercises.push({
        name: exerciseName.trim(),
        sets: extractSets(match[0]) || 1,
        reps: extractReps(match[0]) || 1,
        notes: match[0]
      });
    }
  });
  
  // If no specific exercises found, create a general one
  if (exercises.length === 0) {
    exercises.push({
      name: extractWorkoutType(description),
      sets: 1,
      reps: 1,
      notes: description.substring(0, 200) + (description.length > 200 ? '...' : '')
    });
  }
  
  return exercises.slice(0, 10); // Limit to 10 exercises
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
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('run') || lowerDesc.includes('jog')) return 'Running';
  if (lowerDesc.includes('strength') || lowerDesc.includes('squat') || lowerDesc.includes('deadlift')) return 'Strength Training';
  if (lowerDesc.includes('tempo') || lowerDesc.includes('threshold')) return 'Tempo Run';
  if (lowerDesc.includes('interval') || lowerDesc.includes('speed')) return 'Interval Training';
  if (lowerDesc.includes('hyrox') || lowerDesc.includes('simulation')) return 'Hyrox Training';
  if (lowerDesc.includes('recovery') || lowerDesc.includes('mobility')) return 'Recovery';
  if (lowerDesc.includes('partner') || lowerDesc.includes('doubles')) return 'Partner Training';
  
  return 'General Workout';
}