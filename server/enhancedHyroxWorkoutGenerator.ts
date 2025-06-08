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

// Complex workout generators for different structures
function generateHyroxSimulation(): RandomWorkout {
  const exercises: HyroxExercise[] = [
    { name: "1km Run", distance: 1000, type: "Standard", notes: "Steady pace" },
    { name: "Ski Erg", distance: 1000, type: "For Time", notes: "Full power" },
    { name: "1km Run", distance: 1000, type: "Standard", notes: "Recover pace" },
    { name: "Sled Push", distance: 50, type: "For Time", notes: "Heavy load" },
    { name: "1km Run", distance: 1000, type: "Standard", notes: "Maintain pace" },
    { name: "Sled Pull", distance: 50, type: "For Time", notes: "Heavy load" },
    { name: "1km Run", distance: 1000, type: "Standard", notes: "Push through fatigue" },
    { name: "Burpee Broad Jumps", reps: 80, type: "For Time", notes: "Consistent rhythm" },
  ];

  return {
    name: "HYROX Race Simulation",
    description: "Half race simulation: 4 stations with 1km runs between each",
    estimatedDuration: 35,
    exercises,
    workoutType: "race-prep",
    structure: "Race simulation format"
  };
}

function generateAMRAPWorkout(): RandomWorkout {
  const duration = getRandomElement([15, 18, 20]);
  const selectedExercises = getRandomElements(STRENGTH_EXERCISES, 4);
  
  const exercises: HyroxExercise[] = [
    { 
      name: `AMRAP ${duration} minutes`, 
      type: "AMRAP", 
      duration: duration * 60,
      notes: `Complete as many rounds as possible in ${duration} minutes`
    },
    { name: selectedExercises[0], reps: 12, type: "AMRAP" },
    { name: selectedExercises[1], reps: 15, type: "AMRAP" },
    { name: selectedExercises[2], reps: 18, type: "AMRAP" },
    { name: "400m Run", distance: 400, type: "AMRAP", notes: "Between each round" }
  ];

  return {
    name: `${duration}-Minute AMRAP`,
    description: `As many rounds as possible in ${duration} minutes with running`,
    estimatedDuration: duration + 5,
    exercises,
    workoutType: "conditioning",
    structure: `AMRAP ${duration} minutes`
  };
}

function generateEMOMWorkout(): RandomWorkout {
  const duration = getRandomElement([12, 15, 16, 20]);
  const exercises: HyroxExercise[] = [
    { 
      name: `EMOM ${duration} minutes`, 
      type: "EMOM", 
      duration: duration * 60,
      notes: `Every minute on the minute for ${duration} minutes`
    },
    { name: "Thrusters", reps: 8, type: "EMOM", notes: "Minute 1" },
    { name: "Pull-ups", reps: 6, type: "EMOM", notes: "Minute 2" },
    { name: "Box Jumps", reps: 10, type: "EMOM", notes: "Minute 3" },
    { name: "Burpees", reps: 5, type: "EMOM", notes: "Minute 4" }
  ];

  return {
    name: `${duration}-Minute EMOM`,
    description: `Every minute on the minute power workout`,
    estimatedDuration: duration + 3,
    exercises,
    workoutType: "conditioning",
    structure: `EMOM ${duration} minutes`
  };
}

function generateTabataFinisher(): RandomWorkout {
  const exercise = getRandomElement(HYROX_STATIONS);
  const exercises: HyroxExercise[] = [
    { 
      name: "Tabata Protocol", 
      type: "Tabata", 
      duration: 240,
      rounds: 8,
      workPeriod: 20,
      restPeriod: 10,
      notes: "8 rounds: 20s work / 10s rest"
    },
    { name: exercise, type: "Tabata", notes: "Maximum effort for 20 seconds" }
  ];

  return {
    name: `Tabata ${exercise}`,
    description: "4-minute high-intensity finisher",
    estimatedDuration: 8,
    exercises,
    workoutType: "conditioning",
    structure: "Tabata 8 rounds"
  };
}

function generateIntervalWorkout(): RandomWorkout {
  const rounds = getRandomElement([5, 6, 8]);
  const exercises: HyroxExercise[] = [
    { 
      name: `${rounds} Round Intervals`, 
      type: "Interval", 
      rounds,
      workPeriod: 90,
      restPeriod: 90,
      notes: `${rounds} rounds: 90s work / 90s rest`
    },
    { name: "Ski Erg", distance: 250, type: "Interval" },
    { name: "Kettlebell Swings", reps: 20, type: "Interval" },
    { name: "Box Jumps", reps: 15, type: "Interval" },
    { name: "Push-ups", reps: 12, type: "Interval" }
  ];

  return {
    name: `${rounds}-Round Intervals`,
    description: "High-intensity work/rest intervals",
    estimatedDuration: Math.ceil((rounds * 3) + 5),
    exercises,
    workoutType: "cardio",
    structure: `${rounds} x 90s work/90s rest`
  };
}

function generateChipperWorkout(): RandomWorkout {
  const stationCount = getRandomElement([3, 4, 5]);
  const selectedStations = getRandomElements(HYROX_STATIONS, stationCount);
  
  const exercises: HyroxExercise[] = [
    { 
      name: "For Time", 
      type: "For Time", 
      notes: "Complete all exercises as fast as possible"
    }
  ];

  selectedStations.forEach((station, index) => {
    if (index > 0) {
      exercises.push({ name: "800m Run", distance: 800, type: "For Time" });
    }
    
    switch (station) {
      case "Ski Erg":
        exercises.push({ name: "Ski Erg", distance: 1000, type: "For Time" });
        break;
      case "Burpee Broad Jumps":
        exercises.push({ name: "Burpee Broad Jumps", reps: 60, type: "For Time" });
        break;
      case "Wall Balls":
        exercises.push({ name: "Wall Balls", reps: 80, type: "For Time" });
        break;
      default:
        exercises.push({ name: station, reps: 50, type: "For Time" });
    }
  });

  return {
    name: `${stationCount}-Station Chipper`,
    description: "Complete all stations for time with running between",
    estimatedDuration: 25 + (stationCount * 3),
    exercises,
    workoutType: "mixed",
    structure: "For Time chipper"
  };
}

function generateLadderWorkout(): RandomWorkout {
  const exercise1 = getRandomElement(STRENGTH_EXERCISES);
  const exercise2 = getRandomElement(STRENGTH_EXERCISES.filter(e => e !== exercise1));
  
  const exercises: HyroxExercise[] = [
    { 
      name: "Ascending Ladder", 
      type: "Ladder", 
      notes: "1-2-3-4-5-6-7-8-9-10 reps with 200m run between rounds"
    },
    { name: exercise1, type: "Ladder", notes: "Increase by 1 rep each round" },
    { name: exercise2, type: "Ladder", notes: "Increase by 1 rep each round" },
    { name: "200m Run", distance: 200, type: "Ladder", notes: "Between each round" }
  ];

  return {
    name: "Ascending Ladder",
    description: "Build from 1 to 10 reps with running breaks",
    estimatedDuration: 28,
    exercises,
    workoutType: "mixed",
    structure: "1-10 ladder format"
  };
}

function generateStationFocus(): RandomWorkout {
  const selectedStations = getRandomElements(HYROX_STATIONS, 3);
  const exercises: HyroxExercise[] = [
    { 
      name: "Station Circuit", 
      type: "Standard", 
      rounds: 4,
      notes: "4 rounds with 2 minutes rest between rounds"
    }
  ];

  selectedStations.forEach(station => {
    switch (station) {
      case "Ski Erg":
        exercises.push({ name: "Ski Erg", distance: 500, type: "Standard" });
        break;
      case "Sled Push":
        exercises.push({ name: "Sled Push", distance: 25, type: "Standard" });
        break;
      case "Sled Pull":
        exercises.push({ name: "Sled Pull", distance: 25, type: "Standard" });
        break;
      case "Burpee Broad Jumps":
        exercises.push({ name: "Burpee Broad Jumps", reps: 20, type: "Standard" });
        break;
      case "Rowing":
        exercises.push({ name: "Rowing", distance: 500, type: "Standard" });
        break;
      case "Farmers Carry":
        exercises.push({ name: "Farmers Carry", distance: 100, type: "Standard" });
        break;
      case "Sandbag Lunges":
        exercises.push({ name: "Sandbag Lunges", distance: 50, type: "Standard" });
        break;
      case "Wall Balls":
        exercises.push({ name: "Wall Balls", reps: 25, type: "Standard" });
        break;
    }
  });

  exercises.push({ name: "400m Run", distance: 400, type: "Standard", notes: "After each round" });

  return {
    name: "Station Circuit Training",
    description: "Focus on 3 HYROX stations with running",
    estimatedDuration: 32,
    exercises,
    workoutType: "station-focus",
    structure: "4 rounds of 3 stations"
  };
}

function generateRunningIntervals(): RandomWorkout {
  const intervals = getRandomElement([
    { distance: 400, reps: 8, rest: 90 },
    { distance: 800, reps: 5, rest: 120 },
    { distance: 200, reps: 12, rest: 60 }
  ]);

  const exercises: HyroxExercise[] = [
    { 
      name: "Running Intervals", 
      type: "Interval", 
      rounds: intervals.reps,
      notes: `${intervals.reps} x ${intervals.distance}m with ${intervals.rest}s rest`
    },
    { 
      name: `${intervals.distance}m Run`, 
      distance: intervals.distance, 
      type: "Interval",
      sets: intervals.reps,
      restBetweenSets: intervals.rest 
    }
  ];

  return {
    name: `${intervals.distance}m Running Intervals`,
    description: `Speed endurance training with ${intervals.distance}m repeats`,
    estimatedDuration: Math.ceil((intervals.reps * (intervals.distance / 200 + intervals.rest / 60)) + 10),
    exercises,
    workoutType: "cardio",
    structure: `${intervals.reps} x ${intervals.distance}m intervals`
  };
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomHyroxWorkout(): RandomWorkout {
  const workoutGenerators = [
    generateHyroxSimulation,
    generateAMRAPWorkout,
    generateEMOMWorkout,
    generateTabataFinisher,
    generateIntervalWorkout,
    generateChipperWorkout,
    generateLadderWorkout,
    generateStationFocus,
    generateRunningIntervals
  ];

  const selectedGenerator = getRandomElement(workoutGenerators);
  return selectedGenerator();
}

export { generateRandomHyroxWorkout, type RandomWorkout, type HyroxExercise };