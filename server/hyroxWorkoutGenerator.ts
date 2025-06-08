interface HyroxExercise {
  name: string;
  reps?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  sets?: number;
  restBetweenSets?: number; // in seconds
  type?: 'AMRAP' | 'EMOM' | 'Tabata' | 'Interval' | 'For Time' | 'Chipper' | 'Ladder' | 'Standard';
  rounds?: number;
  workPeriod?: number; // seconds
  restPeriod?: number; // seconds
  notes?: string;
}

interface WorkoutBlock {
  type: 'warmup' | 'main' | 'finisher' | 'running';
  exercises: HyroxExercise[];
  structure: 'AMRAP' | 'EMOM' | 'Tabata' | 'For Time' | 'Intervals' | 'Chipper' | 'Standard';
  duration?: number;
  rounds?: number;
  notes?: string;
}

interface RandomWorkout {
  name: string;
  description: string;
  estimatedDuration: number; // in minutes
  exercises: HyroxExercise[];
  workoutType: 'strength' | 'cardio' | 'mixed' | 'station-focus' | 'race-prep' | 'conditioning';
  structure: string;
}

// HYROX station exercises
const HYROX_STATIONS = [
  "Ski Erg", "Sled Push", "Sled Pull", "Burpee Broad Jumps", 
  "Rowing", "Farmers Carry", "Sandbag Lunges", "Wall Balls"
];

// Functional strength exercises
const STRENGTH_EXERCISES = [
  "Kettlebell Swings", "Thrusters", "Pull-ups", "Push-ups", "Box Jumps",
  "Deadlifts", "Air Squats", "Lunges", "Dumbbell Snatches", "Clean & Press",
  "Russian Twists", "Mountain Climbers", "Plank Hold", "Bear Crawls",
  "Turkish Get-ups", "Battle Ropes", "Slam Balls", "Tire Flips"
];

// Running variations
const RUNNING_EXERCISES = [
  "Running", "Treadmill Run", "Hill Sprints", "Stair Runs", "Shuttle Runs",
  "400m Run", "800m Run", "1km Run", "5-10-5 Drill", "Suicide Runs"
];

// Workout structures with specific formats
const WORKOUT_STRUCTURES = {
  HYROX_SIMULATION: {
    name: "HYROX Race Simulation",
    description: "Full race simulation with all 8 stations",
    format: "8 x (1km Run + Station Exercise)"
  },
  STATION_FOCUS: {
    name: "Station-Focused Training",
    description: "Emphasis on specific HYROX stations",
    format: "Multiple rounds of 2-3 stations with running"
  },
  AMRAP_STRENGTH: {
    name: "Strength AMRAP",
    description: "As Many Rounds As Possible in set time",
    format: "AMRAP 15-20 minutes"
  },
  INTERVAL_CARDIO: {
    name: "Cardio Intervals",
    description: "High-intensity interval training",
    format: "Work/Rest intervals"
  },
  EMOM_POWER: {
    name: "Power EMOM",
    description: "Every Minute On the Minute",
    format: "EMOM 12-20 minutes"
  },
  CHIPPER: {
    name: "Chipper Workout",
    description: "Complete all exercises for time",
    format: "For Time - work through exercise list"
  },
  TABATA_FINISHER: {
    name: "Tabata Finisher",
    description: "4-minute high-intensity finish",
    format: "8 rounds of 20s work / 10s rest"
  },
  LADDER_WORKOUT: {
    name: "Ascending/Descending Ladder",
    description: "Reps increase then decrease",
    format: "Ladder format with running breaks"
  }
};

// Running variations
const RUNNING_EXERCISES = [
  { name: "Running", distance: 1000, sets: 1 },
  { name: "Running", distance: 500, sets: 2, restBetweenSets: 90 },
  { name: "Running Intervals", distance: 400, sets: 3, restBetweenSets: 60 },
  { name: "Running Intervals", distance: 200, sets: 6, restBetweenSets: 45 },
];

// Strength accessories
const STRENGTH_ACCESSORIES = [
  { name: "Push-ups", reps: 20, sets: 3, restBetweenSets: 45 },
  { name: "Pull-ups", reps: 10, sets: 3, restBetweenSets: 60 },
  { name: "Air Squats", reps: 30, sets: 3, restBetweenSets: 45 },
  { name: "Lunges", reps: 20, sets: 3, restBetweenSets: 45 },
  { name: "Mountain Climbers", reps: 40, sets: 3, restBetweenSets: 30 },
  { name: "Plank Hold", duration: 60, sets: 3, restBetweenSets: 30 },
  { name: "Russian Twists", reps: 40, sets: 3, restBetweenSets: 30 },
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomHyroxWorkout(): RandomWorkout {
  const workoutTypes = ['strength', 'cardio', 'mixed', 'station-focus'] as const;
  const workoutType = getRandomElement(workoutTypes);
  
  let exercises: HyroxExercise[] = [];
  let estimatedDuration = 0;
  let name = "";
  let description = "";

  switch (workoutType) {
    case 'strength':
      // Focus on strength with fewer cardio elements
      exercises.push(getRandomElement(RUNNING_EXERCISES));
      exercises.push(...getRandomElements(Object.values(HYROX_STATIONS).flat(), 2));
      exercises.push(...getRandomElements(STRENGTH_ACCESSORIES, 3));
      estimatedDuration = 25;
      name = "HYROX Strength Focus";
      description = "Strength-focused HYROX workout with challenging functional movements";
      break;

    case 'cardio':
      // High cardio intensity
      exercises.push(...getRandomElements(RUNNING_EXERCISES, 2));
      exercises.push(getRandomElement(HYROX_STATIONS.skiErg));
      exercises.push(getRandomElement(HYROX_STATIONS.rowing));
      exercises.push(getRandomElement(HYROX_STATIONS.burpees));
      exercises.push(...getRandomElements(STRENGTH_ACCESSORIES.filter(e => e.name.includes('Mountain') || e.name.includes('Burpee')), 2));
      estimatedDuration = 22;
      name = "HYROX Cardio Blast";
      description = "High-intensity cardio-focused HYROX workout for endurance building";
      break;

    case 'mixed':
      // Balanced approach
      exercises.push(getRandomElement(RUNNING_EXERCISES));
      exercises.push(...getRandomElements(Object.values(HYROX_STATIONS).flat(), 3));
      exercises.push(...getRandomElements(STRENGTH_ACCESSORIES, 2));
      estimatedDuration = 28;
      name = "HYROX Mixed Challenge";
      description = "Balanced HYROX workout combining strength, cardio, and functional movements";
      break;

    case 'station-focus':
      // Focus on specific HYROX stations
      const stationNames = Object.keys(HYROX_STATIONS) as (keyof typeof HYROX_STATIONS)[];
      const selectedStations = getRandomElements(stationNames, 4);
      
      exercises.push(getRandomElement(RUNNING_EXERCISES));
      selectedStations.forEach(station => {
        exercises.push(getRandomElement(HYROX_STATIONS[station]));
      });
      exercises.push(...getRandomElements(STRENGTH_ACCESSORIES, 1));
      estimatedDuration = 30;
      name = "HYROX Station Challenge";
      description = "Station-focused HYROX workout targeting specific competition movements";
      break;
  }

  // Shuffle exercises for variety
  const shuffledExercises = [...exercises].sort(() => 0.5 - Math.random());

  return {
    name,
    description,
    estimatedDuration,
    exercises: shuffledExercises,
    workoutType
  };
}

export { generateRandomHyroxWorkout, type RandomWorkout, type HyroxExercise };