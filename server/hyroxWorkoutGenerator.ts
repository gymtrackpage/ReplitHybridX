interface HyroxExercise {
  name: string;
  reps?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  sets?: number;
  restBetweenSets?: number; // in seconds
}

interface RandomWorkout {
  name: string;
  description: string;
  estimatedDuration: number; // in minutes
  exercises: HyroxExercise[];
  workoutType: 'strength' | 'cardio' | 'mixed' | 'station-focus';
}

// HYROX station-specific exercises
const HYROX_STATIONS = {
  skiErg: [
    { name: "Ski Erg", distance: 1000, sets: 1 },
    { name: "Ski Erg", distance: 500, sets: 2, restBetweenSets: 60 },
    { name: "Ski Erg Intervals", distance: 250, sets: 4, restBetweenSets: 30 },
  ],
  sledPush: [
    { name: "Sled Push", distance: 50, sets: 2, restBetweenSets: 90 },
    { name: "Sled Push", distance: 25, sets: 4, restBetweenSets: 60 },
    { name: "Sled Push Sprint", distance: 15, sets: 6, restBetweenSets: 45 },
  ],
  sledPull: [
    { name: "Sled Pull", distance: 50, sets: 2, restBetweenSets: 90 },
    { name: "Sled Pull", distance: 25, sets: 4, restBetweenSets: 60 },
    { name: "Sled Pull Intervals", distance: 15, sets: 6, restBetweenSets: 45 },
  ],
  burpees: [
    { name: "Burpee Broad Jumps", reps: 80, sets: 1 },
    { name: "Burpee Broad Jumps", reps: 40, sets: 2, restBetweenSets: 120 },
    { name: "Burpee Broad Jumps", reps: 20, sets: 4, restBetweenSets: 90 },
  ],
  rowing: [
    { name: "Rowing", distance: 1000, sets: 1 },
    { name: "Rowing", distance: 500, sets: 2, restBetweenSets: 60 },
    { name: "Rowing Intervals", distance: 250, sets: 4, restBetweenSets: 30 },
  ],
  farmersCarry: [
    { name: "Farmers Carry", distance: 200, sets: 1 },
    { name: "Farmers Carry", distance: 100, sets: 2, restBetweenSets: 90 },
    { name: "Farmers Carry", distance: 50, sets: 4, restBetweenSets: 60 },
  ],
  sandbag: [
    { name: "Sandbag Lunges", distance: 100, sets: 1 },
    { name: "Sandbag Lunges", distance: 50, sets: 2, restBetweenSets: 90 },
    { name: "Sandbag Lunges", distance: 25, sets: 4, restBetweenSets: 60 },
  ],
  wallBalls: [
    { name: "Wall Balls", reps: 100, sets: 1 },
    { name: "Wall Balls", reps: 50, sets: 2, restBetweenSets: 120 },
    { name: "Wall Balls", reps: 25, sets: 4, restBetweenSets: 90 },
  ]
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