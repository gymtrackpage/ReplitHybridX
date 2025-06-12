import * as XLSX from "xlsx";
import { storage } from "./storage";
import { InsertProgram, InsertWorkout } from "../shared/schema";

interface ProgramUploadData {
  name: string;
  description: string;
  difficulty: string;
  category: string;
  duration: number;
  frequency: number;
}

interface WorkoutData {
  week: number;
  day: number;
  name: string;
  description: string;
  duration: number;
  exercises: any;
}

export async function handleCSVUpload(
  fileBuffer: Buffer,
  filename: string,
  programData: ProgramUploadData
): Promise<{ programId: number; workoutCount: number }> {
  let workouts: WorkoutData[] = [];

  // Parse file based on extension
  if (filename.endsWith('.xlsx')) {
    workouts = parseXLSXFile(fileBuffer);
  } else if (filename.endsWith('.csv')) {
    workouts = parseCSVFile(fileBuffer);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or XLSX files.');
  }

  if (workouts.length === 0) {
    throw new Error('No valid workout data found in the uploaded file.');
  }

  // Create the program
  const programInsert: InsertProgram = {
    name: programData.name,
    description: programData.description,
    difficulty: programData.difficulty,
    category: programData.category,
    duration: programData.duration,
    targetEventWeeks: programData.duration,
    isActive: true
  };

  const program = await storage.createProgram(programInsert);

  // Create workouts for the program
  let workoutCount = 0;
  for (const workoutData of workouts) {
    try {
      const workoutInsert: InsertWorkout = {
        programId: program.id,
        week: workoutData.week,
        day: workoutData.day,
        name: workoutData.name,
        description: workoutData.description,
        estimatedDuration: workoutData.duration,
        exercises: typeof workoutData.exercises === 'string' 
          ? JSON.parse(workoutData.exercises) 
          : workoutData.exercises
      };

      await storage.createWorkout(workoutInsert);
      workoutCount++;
    } catch (error) {
      console.warn(`Failed to create workout: ${workoutData.name}`, error);
    }
  }

  return { programId: program.id, workoutCount };
}

function parseCSVFile(buffer: Buffer): WorkoutData[] {
  const csvContent = buffer.toString('utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain header and data rows');
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const requiredColumns = ['week', 'day', 'name', 'description', 'duration', 'exercises'];
  
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const workouts: WorkoutData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    
    const values = parseCSVLine(row);
    
    if (values.length >= requiredColumns.length) {
      const workout: any = {};
      header.forEach((col, index) => {
        workout[col] = values[index] || '';
      });
      
      workouts.push({
        week: parseInt(workout.week) || 1,
        day: parseInt(workout.day) || 1,
        name: workout.name || 'Unnamed Workout',
        description: workout.description || '',
        duration: parseInt(workout.duration) || 60,
        exercises: parseExercises(workout.exercises || '[]')
      });
    }
  }

  return workouts;
}

function parseXLSXFile(buffer: Buffer): WorkoutData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length < 2) {
    throw new Error('XLSX file must contain header and data rows');
  }

  const header = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim());
  const requiredColumns = ['week', 'day', 'name', 'description', 'duration', 'exercises'];
  
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const workouts: WorkoutData[] = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const workout: any = {};
    header.forEach((col, index) => {
      workout[col] = row[index]?.toString() || '';
    });
    
    workouts.push({
      week: parseInt(workout.week) || 1,
      day: parseInt(workout.day) || 1,
      name: workout.name || 'Unnamed Workout',
      description: workout.description || '',
      duration: parseInt(workout.duration) || 60,
      exercises: parseExercises(workout.exercises || '[]')
    });
  }

  return workouts;
}

function parseCSVLine(line: string): string[] {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  
  return values;
}

function parseExercises(exerciseStr: string): any {
  try {
    // Try to parse as JSON first
    return JSON.parse(exerciseStr);
  } catch {
    // If not JSON, treat as plain text description
    return exerciseStr;
  }
}