// Program Selection Algorithm - Based on the AppsScript implementation
import { Program } from "@shared/schema";

// Program definitions with fit scores for each category
export const HYROX_PROGRAMS = {
  "BeginnerProgram": {
    id: "BeginnerProgram",
    name: "Complete Beginner 14-Week Program",
    description: "Perfect for those new to HYROX or structured training. Builds foundational fitness.",
    totalWeeks: 14,
    experienceFit: { 
      "Complete Beginner": 1.0, 
      "Fitness Enthusiast": 0.8, 
      "HYROX Novice": 0.4, 
      "Intermediate": 0.2, 
      "Advanced": 0.0, 
      "Elite": 0.0 
    },
    backgroundFit: { 
      "General Fitness": 0.9, 
      "Running/Endurance": 0.7, 
      "Strength/CrossFit": 0.7, 
      "Team Sports": 0.8, 
      "No Significant Background": 1.0 
    },
    timeFit: { 
      "Very Limited": 0.6, 
      "Limited": 0.7, 
      "Moderate": 0.9, 
      "Substantial": 0.8, 
      "Extensive": 0.6 
    },
    categoryFit: { 
      "Standard": 1.0, 
      "Masters 40-49": 0.9, 
      "Masters 50+": 0.8, 
      "Doubles Competitor": 0.7, 
      "Relay Team": 0.5, 
      "Injury Rehabilitation": 0.8, 
      "Off-Season": 0.3 
    }
  },
  "IntermediateProgram": {
    id: "IntermediateProgram",
    name: "Intermediate Performance 14-Week Program",
    description: "For those with some HYROX experience or a good fitness base looking to improve performance.",
    totalWeeks: 14,
    experienceFit: { 
      "Complete Beginner": 0.2, 
      "Fitness Enthusiast": 0.5, 
      "HYROX Novice": 1.0, 
      "Intermediate": 1.0, 
      "Advanced": 0.6, 
      "Elite": 0.3 
    },
    backgroundFit: { 
      "General Fitness": 0.5, 
      "Running/Endurance": 0.8, 
      "Strength/CrossFit": 0.8, 
      "Team Sports": 0.6, 
      "No Significant Background": 0.2 
    },
    timeFit: { 
      "Very Limited": 0.2, 
      "Limited": 0.5, 
      "Moderate": 0.8, 
      "Substantial": 1.0, 
      "Extensive": 0.9 
    },
    categoryFit: { 
      "Standard": 1.0, 
      "Masters 40-49": 1.0, 
      "Masters 50+": 0.9, 
      "Doubles Competitor": 0.8, 
      "Relay Team": 0.6, 
      "Injury Rehabilitation": 0.5, 
      "Off-Season": 0.7 
    }
  },
  "AdvancedProgram": {
    id: "AdvancedProgram",
    name: "Advanced Competitor 14-Week Program",
    description: "Designed for experienced HYROX athletes aiming for competitive times and podium finishes.",
    totalWeeks: 14,
    experienceFit: { 
      "Complete Beginner": 0.0, 
      "Fitness Enthusiast": 0.1, 
      "HYROX Novice": 0.4, 
      "Intermediate": 0.7, 
      "Advanced": 1.0, 
      "Elite": 1.0 
    },
    backgroundFit: { 
      "General Fitness": 0.3, 
      "Running/Endurance": 0.7, 
      "Strength/CrossFit": 1.0, 
      "Team Sports": 0.5, 
      "No Significant Background": 0.1 
    },
    timeFit: { 
      "Very Limited": 0.1, 
      "Limited": 0.3, 
      "Moderate": 0.7, 
      "Substantial": 0.9, 
      "Extensive": 1.0 
    },
    categoryFit: { 
      "Standard": 1.0, 
      "Masters 40-49": 0.8, 
      "Masters 50+": 0.7, 
      "Doubles Competitor": 1.0, 
      "Relay Team": 0.8, 
      "Injury Rehabilitation": 0.3, 
      "Off-Season": 0.9 
    }
  },
  "RunnerProgram": {
    id: "RunnerProgram",
    name: "Improve your Running Program",
    description: "A program to improve your running capacity and speed whilst training for Hyrox.",
    totalWeeks: 4,
    experienceFit: { 
      "Complete Beginner": 0.3, 
      "Fitness Enthusiast": 0.8, 
      "HYROX Novice": 0.8, 
      "Intermediate": 0.8, 
      "Advanced": 0.3, 
      "Elite": 0.2 
    },
    backgroundFit: { 
      "General Fitness": 0.6, 
      "Running/Endurance": 0.3, 
      "Strength/CrossFit": 0.8, 
      "Team Sports": 0.4, 
      "No Significant Background": 0.8 
    },
    timeFit: { 
      "Very Limited": 0.7, 
      "Limited": 0.8, 
      "Moderate": 1.0, 
      "Substantial": 0.9, 
      "Extensive": 0.8 
    },
    categoryFit: { 
      "Standard": 0.8, 
      "Masters 40-49": 0.8, 
      "Masters 50+": 0.5, 
      "Doubles Competitor": 0.5, 
      "Relay Team": 0.5, 
      "Injury Rehabilitation": 0.3, 
      "Off-Season": 0.4 
    }
  },
  "StrengthProgram": {
    id: "StrengthProgram",
    name: "Improve your Strength Program",
    description: "Are you a strong runner looking to improve your strength and power whilst training for Hyrox.",
    totalWeeks: 4,
    experienceFit: { 
      "Complete Beginner": 0.3, 
      "Fitness Enthusiast": 0.5, 
      "HYROX Novice": 0.8, 
      "Intermediate": 0.8, 
      "Advanced": 0.5, 
      "Elite": 0.2 
    },
    backgroundFit: { 
      "General Fitness": 0.7, 
      "Running/Endurance": 0.9, 
      "Strength/CrossFit": 0.3, 
      "Team Sports": 0.6, 
      "No Significant Background": 0.6 
    },
    timeFit: { 
      "Very Limited": 0.7, 
      "Limited": 0.8, 
      "Moderate": 1.0, 
      "Substantial": 0.9, 
      "Extensive": 0.8 
    },
    categoryFit: { 
      "Standard": 0.8, 
      "Masters 40-49": 0.6, 
      "Masters 50+": 0.4, 
      "Doubles Competitor": 0.5, 
      "Relay Team": 0.5, 
      "Injury Rehabilitation": 0.5, 
      "Off-Season": 0.5 
    }
  },
  "DoublesProgram": {
    id: "DoublesProgram",
    name: "HYROX Doubles/Relay Performance Program",
    description: "Tailored for the unique demands of HYROX Doubles and Relay competitions.",
    totalWeeks: 14,
    experienceFit: { 
      "Complete Beginner": 0.1, 
      "Fitness Enthusiast": 0.4, 
      "HYROX Novice": 0.8, 
      "Intermediate": 1.0, 
      "Advanced": 1.0, 
      "Elite": 0.8 
    },
    backgroundFit: { 
      "General Fitness": 0.7, 
      "Running/Endurance": 0.8, 
      "Strength/CrossFit": 0.8, 
      "Team Sports": 1.0, 
      "No Significant Background": 0.1
    },
    timeFit: { 
      "Very Limited": 0.2, 
      "Limited": 0.5, 
      "Moderate": 0.8, 
      "Substantial": 1.0, 
      "Extensive": 0.9 
    },
    categoryFit: { 
      "Standard": 0.5, 
      "Masters 40-49": 0.5, 
      "Masters 50+": 0.4, 
      "Doubles Competitor": 1.0, 
      "Relay Team": 1.0, 
      "Injury Rehabilitation": 0.2, 
      "Off-Season": 0.6 
    }
  }
};

const DEFAULT_PROGRAM_ID = "IntermediateProgram";

export interface AssessmentData {
  hyroxEventsCompleted?: number;
  bestFinishTime?: string;
  generalFitnessYears?: number;
  primaryTrainingBackground?: string;
  weeklyTrainingDays?: number;
  avgSessionLength?: number;
  competitionFormat?: string;
  age?: number;
  injuryHistory?: boolean;
  injuryRecent?: boolean;
  kilometerRunTime?: number;
  squatMaxReps?: number;
  goals?: string[];
  equipmentAccess?: string;
}

export interface FitnessProfile {
  runningCapacity: number;
  strengthFoundation: number;
  movementQuality: number;
  workCapacity: number;
  stationEfficiency: number;
}

export interface ProgramRecommendation {
  recommendedProgram: any;
  modifications: any[];
  reasoningExplanation: string;
  experienceLevel: string;
  trainingBackground: string;
  timeAvailability: string;
  specialCategory: string;
  fitnessProfile: FitnessProfile;
}

// Assessment helper functions
export function assessExperienceLevel(userData: AssessmentData): string {
  let finishTimeSeconds = 0;
  if (userData.bestFinishTime) {
    if (typeof userData.bestFinishTime === 'string' && userData.bestFinishTime.includes(':')) {
      const timeParts = userData.bestFinishTime.split(':').map(Number);
      finishTimeSeconds = (timeParts[0] || 0) * 3600 + (timeParts[1] || 0) * 60 + (timeParts[2] || 0);
    } else if (typeof userData.bestFinishTime === 'number') {
      finishTimeSeconds = userData.bestFinishTime;
    }
  }
  const eventsCompleted = parseInt(String(userData.hyroxEventsCompleted)) || 0;
  const fitnessYears = parseInt(String(userData.generalFitnessYears)) || 0;

  if (eventsCompleted === 0) return fitnessYears > 1 ? "Fitness Enthusiast" : "Complete Beginner";
  if (eventsCompleted <= 2) return finishTimeSeconds > 0 && finishTimeSeconds <= 5400 ? "Intermediate" : "HYROX Novice";
  if (eventsCompleted <= 5) return finishTimeSeconds > 0 && finishTimeSeconds <= 4200 ? "Advanced" : "Intermediate";
  return finishTimeSeconds > 0 && finishTimeSeconds <= 3900 ? "Elite" : "Advanced";
}

export function assessTrainingBackground(userData: AssessmentData): string {
  if (userData.primaryTrainingBackground && userData.primaryTrainingBackground !== "No Significant Background") {
    return userData.primaryTrainingBackground;
  }
  
  const strengthScore = calculateStrengthScore(userData);
  const enduranceScore = calculateEnduranceScore(userData);
  const differenceThreshold = 2;

  if (strengthScore === 0 && enduranceScore === 0) return "No Significant Background";
  if (Math.abs(strengthScore - enduranceScore) < differenceThreshold) return "General Fitness";
  return strengthScore > enduranceScore ? "Strength/CrossFit" : "Running/Endurance";
}

function calculateStrengthScore(userData: AssessmentData): number {
  let score = 0;
  const squatMaxReps = parseInt(String(userData.squatMaxReps)) || 0;
  if (squatMaxReps) score += Math.min(5, squatMaxReps / 10);
  return score;
}

function calculateEnduranceScore(userData: AssessmentData): number {
  let score = 0;
  const kmRunTime = parseFloat(String(userData.kilometerRunTime)) || 0;
  if (kmRunTime > 0) score += Math.min(5, (5 / kmRunTime) * 2.5);
  return score;
}

export function assessTimeAvailability(userData: AssessmentData): string {
  const weeklyDays = parseInt(String(userData.weeklyTrainingDays)) || 0;
  const sessionLength = parseFloat(String(userData.avgSessionLength)) || 0;
  const weeklyHours = weeklyDays * sessionLength;
  
  if (weeklyHours < 3) return "Very Limited";
  if (weeklyHours < 5) return "Limited";
  if (weeklyHours < 8) return "Moderate";
  if (weeklyHours < 12) return "Substantial";
  return "Extensive";
}

export function checkSpecialCategories(userData: AssessmentData): string {
  const age = parseInt(String(userData.age)) || 30;
  if (userData.competitionFormat === "Doubles") return "Doubles Competitor";
  if (userData.competitionFormat === "Relay") return "Relay Team";
  if (age >= 50) return "Masters 50+";
  if (age >= 40) return "Masters 40-49";
  if (userData.injuryHistory === true && userData.injuryRecent === true) return "Injury Rehabilitation";
  return "Standard";
}

export function assessFitnessProfile(userData: AssessmentData): FitnessProfile {
  return {
    runningCapacity: evaluateMetric(userData.kilometerRunTime, 5, true),
    strengthFoundation: evaluateMetric(userData.squatMaxReps, 30, false),
    movementQuality: 5, // Default values for now
    workCapacity: 5,
    stationEfficiency: 5
  };
}

function evaluateMetric(value: any, baseline: number, lowerIsBetter: boolean, scale: number = 10): number {
  const numValue = parseFloat(String(value));
  if (isNaN(numValue) || numValue === 0) return scale / 2;
  if (lowerIsBetter) {
    return Math.min(scale, Math.max(0, (baseline / numValue) * (scale / 2)));
  } else {
    return Math.min(scale, Math.max(0, (numValue / baseline) * (scale / 2)));
  }
}

function calculateFitnessProfileFit(program: any, fitnessProfile: FitnessProfile): number {
  return 0.8; // Default value for now
}

export function weightedProgramSelection(
  experienceLevel: string, 
  trainingBackground: string, 
  timeAvailability: string, 
  specialCategory: string, 
  fitnessProfile: FitnessProfile, 
  goals: string[]
): any {
  let programScores: { [key: string]: number } = {};
  let bestProgramId: string | null = null;
  let highestScore = -Infinity;

  const programsToEvaluate = Object.values(HYROX_PROGRAMS);
  
  programsToEvaluate.forEach(program => {
    const expFitScore = (program.experienceFit && (program.experienceFit as any)[experienceLevel] !== undefined) ? 
      (program.experienceFit as any)[experienceLevel] : 0;
    const bgFitScore = (program.backgroundFit && (program.backgroundFit as any)[trainingBackground] !== undefined) ? 
      (program.backgroundFit as any)[trainingBackground] : 0;
    const timeFitScore = (program.timeFit && (program.timeFit as any)[timeAvailability] !== undefined) ? 
      (program.timeFit as any)[timeAvailability] : 0;
    const catFitScore = (program.categoryFit && (program.categoryFit as any)[specialCategory] !== undefined) ? 
      (program.categoryFit as any)[specialCategory] : 0;
    const profileFitScore = calculateFitnessProfileFit(program, fitnessProfile);

    // Weighted scoring
    const currentScore =
      (expFitScore * 0.35) +
      (bgFitScore * 0.25) +
      (timeFitScore * 0.20) +
      (catFitScore * 0.10) +
      (profileFitScore * 0.10);
    
    programScores[program.id] = currentScore;

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestProgramId = program.id;
    }
  });
  
  if (!bestProgramId) {
    bestProgramId = DEFAULT_PROGRAM_ID;
  }

  return (HYROX_PROGRAMS as any)[bestProgramId];
}

export function recommendModifications(program: any, userData: AssessmentData): any[] {
  let modifications: any[] = [];
  
  if (parseInt(String(userData.age)) > 50) {
    modifications.push({ 
      type: "Intensity", 
      action: "Add an extra rest day or active recovery.", 
      reason: "Age consideration for recovery." 
    });
  }
  
  if (userData.injuryHistory === true || userData.injuryRecent === true) {
    modifications.push({ 
      type: "Volume", 
      action: "Reduce overall volume by 10-15%", 
      reason: "Injury history consideration." 
    });
  }
  
  return modifications;
}

export function generateExplanation(
  experienceLevel: string, 
  trainingBackground: string, 
  timeAvailability: string, 
  specialCategory: string, 
  fitnessProfile: FitnessProfile, 
  goals: string[], 
  recommendedProgram: any
): string {
  if (!recommendedProgram || !recommendedProgram.name) {
    return "Could not determine a suitable program. Please review your assessment.";
  }
  
  return `Based on your experience as a ${experienceLevel}, background in ${trainingBackground}, ` +
         `${timeAvailability.toLowerCase()} time availability, and category as ${specialCategory.toLowerCase()}, ` +
         `the "${recommendedProgram.name}" is recommended. This program aligns with your fitness profile ` +
         `(Running: ${fitnessProfile.runningCapacity.toFixed(1)}/10, Strength: ${fitnessProfile.strengthFoundation.toFixed(1)}/10) ` +
         `and your goals: ${goals.join(", ")}.`;
}

export function selectHyroxProgram(assessmentData: AssessmentData): ProgramRecommendation {
  try {
    const experienceLevel = assessExperienceLevel(assessmentData);
    const trainingBackground = assessTrainingBackground(assessmentData);
    const timeAvailability = assessTimeAvailability(assessmentData);
    const specialCategory = checkSpecialCategories(assessmentData);
    const fitnessProfile = assessFitnessProfile(assessmentData);
    const goals = assessmentData.goals || ["Complete first HYROX"];

    let recommendedProgram = weightedProgramSelection(
      experienceLevel, trainingBackground, timeAvailability, specialCategory, fitnessProfile, goals
    );

    if (!recommendedProgram) {
      recommendedProgram = HYROX_PROGRAMS[DEFAULT_PROGRAM_ID];
    }

    const programModifications = recommendModifications(recommendedProgram, assessmentData);
    const reasoning = generateExplanation(experienceLevel, trainingBackground, timeAvailability, specialCategory, fitnessProfile, goals, recommendedProgram);

    return {
      recommendedProgram: recommendedProgram,
      modifications: programModifications,
      reasoningExplanation: reasoning,
      experienceLevel: experienceLevel,
      trainingBackground: trainingBackground,
      timeAvailability: timeAvailability,
      specialCategory: specialCategory,
      fitnessProfile: fitnessProfile
    };
  } catch (error) {
    console.error("Error in selectHyroxProgram:", error);
    return {
      recommendedProgram: HYROX_PROGRAMS[DEFAULT_PROGRAM_ID],
      modifications: [],
      reasoningExplanation: "An error occurred during program selection. A default program has been assigned.",
      experienceLevel: "Unknown",
      trainingBackground: "Unknown",
      timeAvailability: "Unknown",
      specialCategory: "Unknown",
      fitnessProfile: {
        runningCapacity: 5,
        strengthFoundation: 5,
        movementQuality: 5,
        workCapacity: 5,
        stationEfficiency: 5
      }
    };
  }
}