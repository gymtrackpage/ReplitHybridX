import { storage } from "./storage";
import { InsertProgram, InsertWorkout } from "@shared/schema";
import * as XLSX from "xlsx";

interface ProgramUploadData {
  name: string;
  description: string;
  difficulty: string;
  category: string;
  duration: number;
  frequency: number;
  racecategory: string;
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
    isActive: true,
    racecategory: programData.racecategory
  };

  const program = await storage.createProgram(programInsert);

  // Create workouts for the program
  let workoutCount = 0;
  for (const workoutData of workouts) {
    try {
      const workoutInsert: InsertWorkout = {
        programId: program.id,
        name: workoutData.name,
        week: workoutData.week,
        day: workoutData.day,
        description: workoutData.description,
        estimatedDuration: workoutData.duration,
        exercises: workoutData.exercises
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
  const csvContent = buffer.toString('utf-8');
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

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    
    const values = parseCSVLine(row);
    
    if (values.length < header.length) continue;

    const workout: any = {};
    header.forEach((col, index) => {
      workout[col] = values[index]?.trim() || '';
    });

    // Validate required fields
    if (!workout.week || !workout.day || !workout.name) {
      console.warn(`Skipping row ${i + 1}: Missing required fields`);
      continue;
    }

    try {
      const workoutData: WorkoutData = {
        week: parseInt(workout.week),
        day: parseInt(workout.day),
        name: workout.name,
        description: workout.description || '',
        duration: parseInt(workout.duration) || 60,
        exercises: parseExercises(workout.exercises)
      };

      if (workoutData.week > 0 && workoutData.day > 0 && workoutData.day <= 7) {
        workouts.push(workoutData);
      }
    } catch (error) {
      console.warn(`Failed to parse row ${i + 1}:`, error);
    }
  }

  return workouts;
}

function parseXLSXFile(buffer: Buffer): WorkoutData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) {
    throw new Error('XLSX file must contain header and data rows');
  }

  const header = data[0] as string[];
  const requiredColumns = ['week', 'day', 'name', 'description', 'duration', 'exercises'];
  
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const workouts: WorkoutData[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row || row.length === 0) continue;

    const workout: any = {};
    header.forEach((col, index) => {
      workout[col] = row[index] || '';
    });

    // Validate required fields
    if (!workout.week || !workout.day || !workout.name) {
      console.warn(`Skipping row ${i + 1}: Missing required fields`);
      continue;
    }

    try {
      const workoutData: WorkoutData = {
        week: parseInt(workout.week),
        day: parseInt(workout.day),
        name: workout.name,
        description: workout.description || '',
        duration: parseInt(workout.duration) || 60,
        exercises: parseExercises(workout.exercises)
      };

      if (workoutData.week > 0 && workoutData.day > 0 && workoutData.day <= 7) {
        workouts.push(workoutData);
      }
    } catch (error) {
      console.warn(`Failed to parse row ${i + 1}:`, error);
    }
  }

  return workouts;
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
      fields.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim().replace(/^"|"$/g, ''));
  return fields;
}

function parseExercises(exerciseStr: string): any {
  if (!exerciseStr || exerciseStr.trim() === '') {
    return [];
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(exerciseStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    // If JSON parsing fails, treat as plain text description
  }

  // Return as simple text description
  return [{
    name: "General Workout",
    description: exerciseStr.trim(),
    type: "general"
  }];
}