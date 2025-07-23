// Metadata-Based Program Selection Algorithm
import { Program } from "@shared/schema";

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

export interface ProgramMetadata {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  frequency: number; // workouts per week
  category: 'Hyrox' | 'Strength' | 'Running' | 'Mixed';
  raceCategory: 'Singles' | 'Doubles/Relay';
}

export interface UserProfile {
  preferredDifficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  availableFrequency: number;
  preferredCategory: 'Hyrox' | 'Strength' | 'Running' | 'Mixed';
  preferredRaceCategory: 'Singles' | 'Doubles/Relay';
  difficultyConfidence: number; // 0-1, how confident we are in difficulty assessment
  categoryPreferences: { [key: string]: number }; // multiple category scores
}

export interface ProgramWithScore {
  program: any; // Your database program object
  metadata: ProgramMetadata;
  totalScore: number;
  scoreBreakdown: {
    difficulty: number;
    frequency: number;
    category: number;
    raceCategory: number;
  };
}

export interface ProgramRecommendation {
  recommendedPrograms: ProgramWithScore[];
  userProfile: UserProfile;
  modifications: any[];
  reasoningExplanation: string;
  // Legacy fields for backward compatibility
  recommendedProgram?: any;
  experienceLevel?: string;
  trainingBackground?: string;
  timeAvailability?: string;
  specialCategory?: string;
  fitnessProfile?: FitnessProfile;
}

// Legacy program definitions for backward compatibility
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

// === USER PROFILE GENERATION ===

export function generateUserProfile(assessmentData: AssessmentData): UserProfile {
  const preferredDifficulty = assessDifficultyPreference(assessmentData);
  const availableFrequency = assessFrequencyCapacity(assessmentData);
  const categoryPrefs = assessCategoryPreferences(assessmentData);
  const preferredRaceCategory = assessRaceCategoryPreference(assessmentData);
  const difficultyConfidence = calculateDifficultyConfidence(assessmentData);

  // Get primary category (highest scoring)
  const preferredCategory = Object.entries(categoryPrefs)
    .sort(([,a], [,b]) => b - a)[0][0] as 'Hyrox' | 'Strength' | 'Running' | 'Mixed';

  return {
    preferredDifficulty,
    availableFrequency,
    preferredCategory,
    preferredRaceCategory,
    difficultyConfidence,
    categoryPreferences: categoryPrefs
  };
}

function assessDifficultyPreference(data: AssessmentData): 'Beginner' | 'Intermediate' | 'Advanced' {
  const events = data.hyroxEventsCompleted || 0;
  const fitnessYears = data.generalFitnessYears || 0;
  const background = data.primaryTrainingBackground || '';

  // Strong indicators for Advanced
  if (events >= 3 && ['crossfit', 'powerlifting'].includes(background)) {
    return 'Advanced';
  }
  
  // Strong indicators for Beginner
  if (events === 0 && fitnessYears < 2 && ['beginner', 'general'].includes(background)) {
    return 'Beginner';
  }
  
  // Advanced: Multiple events OR very experienced
  if (events >= 6 || (events >= 3 && fitnessYears >= 3)) {
    return 'Advanced';
  }
  
  // Beginner: No events AND limited experience
  if (events === 0 && (fitnessYears < 1 || background === 'beginner')) {
    return 'Beginner';
  }
  
  // Everything else is Intermediate
  return 'Intermediate';
}

function assessFrequencyCapacity(data: AssessmentData): number {
  const weeklyDays = data.weeklyTrainingDays || 3;
  
  // Conservative frequency based on weekly training days
  // Most programs have 3-6 workouts per week
  if (weeklyDays <= 2) return 3;
  if (weeklyDays <= 3) return 4;
  if (weeklyDays <= 4) return 5;
  if (weeklyDays <= 5) return 6;
  return 6; // Cap at 6 workouts per week
}

function assessCategoryPreferences(data: AssessmentData): { [key: string]: number } {
  const goals = data.goals || [];
  const background = data.primaryTrainingBackground || '';
  
  let scores: { [key: string]: number } = {
    'Hyrox': 0.5,      // Base score for everyone
    'Strength': 0.3,
    'Running': 0.3,
    'Mixed': 0.4
  };

  // Goal-based preferences (strong indicators)
  goals.forEach(goal => {
    switch (goal) {
      case 'first-hyrox':
      case 'improve-time':
        scores['Hyrox'] += 0.4;
        break;
      case 'strength':
        scores['Strength'] += 0.5;
        break;
      case 'general-fitness':
        scores['Mixed'] += 0.3;
        break;
    }
  });

  // Background-based preferences
  switch (background) {
    case 'running':
      scores['Running'] += 0.4;
      scores['Hyrox'] += 0.2; // Runners often need more well-rounded training
      break;
    case 'crossfit':
      scores['Hyrox'] += 0.3;
      scores['Mixed'] += 0.2;
      break;
    case 'powerlifting':
      scores['Strength'] += 0.3;
      scores['Hyrox'] += 0.2; // Need to add cardio/running
      break;
    case 'general':
      scores['Mixed'] += 0.3;
      scores['Hyrox'] += 0.2;
      break;
    case 'beginner':
      scores['Mixed'] += 0.2;
      break;
  }

  // Normalize scores to 0-1 range
  const maxScore = Math.max(...Object.values(scores));
  Object.keys(scores).forEach(key => {
    scores[key] = Math.min(1.0, scores[key] / maxScore);
  });

  return scores;
}

function assessRaceCategoryPreference(data: AssessmentData): 'Singles' | 'Doubles/Relay' {
  const format = data.competitionFormat;
  
  if (format === 'doubles') return 'Doubles/Relay';
  if (format === 'singles') return 'Singles';
  
  // Default to Singles if 'both' or undefined (more common)
  return 'Singles';
}

function calculateDifficultyConfidence(data: AssessmentData): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence with more HYROX events
  const events = data.hyroxEventsCompleted || 0;
  if (events >= 3) confidence += 0.3;
  else if (events >= 1) confidence += 0.2;
  
  // Higher confidence with clear training background
  if (['crossfit', 'powerlifting', 'running'].includes(data.primaryTrainingBackground || '')) {
    confidence += 0.2;
  }
  
  // Higher confidence with more fitness experience
  const fitnessYears = data.generalFitnessYears || 0;
  if (fitnessYears >= 3) confidence += 0.2;
  else if (fitnessYears >= 1) confidence += 0.1;
  
  return Math.min(1.0, confidence);
}

export interface FitnessProfile {
  runningCapacity: number;
  strengthFoundation: number;
  movementQuality: number;
  workCapacity: number;
  stationEfficiency: number;
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

// === PROGRAM SCORING ===

export function scoreProgram(
  program: any, 
  metadata: ProgramMetadata, 
  userProfile: UserProfile
): ProgramWithScore {
  const difficultyScore = scoreDifficulty(metadata.difficulty, userProfile);
  const frequencyScore = scoreFrequency(metadata.frequency, userProfile);
  const categoryScore = scoreCategory(metadata.category, userProfile);
  const raceCategoryScore = scoreRaceCategory(metadata.raceCategory, userProfile);

  // Weighted total score
  const totalScore = 
    (difficultyScore * 0.35) +
    (frequencyScore * 0.25) +
    (categoryScore * 0.25) +
    (raceCategoryScore * 0.15);

  return {
    program,
    metadata,
    totalScore,
    scoreBreakdown: {
      difficulty: difficultyScore,
      frequency: frequencyScore,
      category: categoryScore,
      raceCategory: raceCategoryScore
    }
  };
}

function scoreDifficulty(
  programDifficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  userProfile: UserProfile
): number {
  const { preferredDifficulty, difficultyConfidence } = userProfile;
  
  // Perfect match
  if (programDifficulty === preferredDifficulty) {
    return 1.0;
  }
  
  // Adjacent difficulty levels (with confidence adjustment)
  const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced'];
  const userIndex = difficultyOrder.indexOf(preferredDifficulty);
  const programIndex = difficultyOrder.indexOf(programDifficulty);
  const difference = Math.abs(userIndex - programIndex);
  
  if (difference === 1) {
    // Adjacent levels - score based on confidence and direction
    const baseScore = 0.6;
    
    // If low confidence, be more forgiving
    if (difficultyConfidence < 0.6) {
      return baseScore + 0.2;
    }
    
    // Slightly prefer stepping up vs stepping down for borderline cases
    if (programIndex > userIndex) {
      return baseScore + 0.1; // Program is harder
    }
    
    return baseScore;
  }
  
  // Two levels apart (Beginner <-> Advanced)
  return 0.2;
}

function scoreFrequency(programFrequency: number, userProfile: UserProfile): number {
  const { availableFrequency } = userProfile;
  
  // Perfect match or program requires fewer sessions
  if (programFrequency <= availableFrequency) {
    return 1.0;
  }
  
  // Program requires more sessions than available
  const difference = programFrequency - availableFrequency;
  
  if (difference === 1) return 0.7; // Just one session over
  if (difference === 2) return 0.4; // Two sessions over
  
  return 0.1; // Too many sessions required
}

function scoreCategory(
  programCategory: 'Hyrox' | 'Strength' | 'Running' | 'Mixed',
  userProfile: UserProfile
): number {
  return userProfile.categoryPreferences[programCategory] || 0.3;
}

function scoreRaceCategory(
  programRaceCategory: 'Singles' | 'Doubles/Relay',
  userProfile: UserProfile
): number {
  if (programRaceCategory === userProfile.preferredRaceCategory) {
    return 1.0;
  }
  
  // If user prefers both or program is general, still decent match
  return 0.6;
}

// === MAIN RECOMMENDATION FUNCTION ===

export function recommendPrograms(
  assessmentData: AssessmentData,
  availablePrograms: Array<{ program: any; metadata: ProgramMetadata }>
): ProgramRecommendation {
  const userProfile = generateUserProfile(assessmentData);
  
  // Score all programs
  const scoredPrograms = availablePrograms.map(({ program, metadata }) =>
    scoreProgram(program, metadata, userProfile)
  );
  
  // Sort by total score (highest first)
  const rankedPrograms = scoredPrograms.sort((a, b) => b.totalScore - a.totalScore);
  
  // Generate modifications
  const modifications = generateModifications(assessmentData, rankedPrograms[0]);
  
  // Generate explanation
  const reasoningExplanation = generateReasoningExplanation(
    userProfile, 
    rankedPrograms.slice(0, 3), // Top 3 programs
    assessmentData
  );
  
  return {
    recommendedPrograms: rankedPrograms,
    userProfile,
    modifications,
    reasoningExplanation,
    // Legacy compatibility fields
    recommendedProgram: rankedPrograms[0]?.program,
    experienceLevel: userProfile.preferredDifficulty,
    trainingBackground: userProfile.preferredCategory,
    timeAvailability: `${userProfile.availableFrequency} days/week`,
    specialCategory: userProfile.preferredRaceCategory,
    fitnessProfile: {
      runningCapacity: 5,
      strengthFoundation: 5,
      movementQuality: 5,
      workCapacity: 5,
      stationEfficiency: 5
    }
  };
}

// === HELPER FUNCTIONS ===

function generateModifications(assessmentData: AssessmentData, topProgram: ProgramWithScore): any[] {
  const modifications: any[] = [];
  
  // Age-based modifications
  const age = assessmentData.age || 30;
  if (age >= 50) {
    modifications.push({
      type: "Recovery",
      action: "Add an extra rest day between intense sessions",
      reason: "Enhanced recovery for Masters 50+ category"
    });
  }
  
  // Injury-based modifications
  if (assessmentData.injuryHistory || assessmentData.injuryRecent) {
    modifications.push({
      type: "Volume",
      action: "Reduce training volume by 15% for first 2 weeks",
      reason: "Gradual progression due to injury history"
    });
  }
  
  // Frequency mismatch modifications
  if (topProgram.scoreBreakdown.frequency < 0.8) {
    modifications.push({
      type: "Frequency",
      action: "Consider combining shorter sessions or reducing rest periods",
      reason: "Program frequency slightly exceeds your available training days"
    });
  }
  
  // Equipment access modifications
  if (assessmentData.equipmentAccess === 'minimal') {
    modifications.push({
      type: "Equipment",
      action: "Focus on bodyweight and running variations",
      reason: "Adapted for minimal equipment access"
    });
  }
  
  return modifications;
}

function generateReasoningExplanation(
  userProfile: UserProfile,
  topPrograms: ProgramWithScore[],
  assessmentData: AssessmentData
): string {
  const topProgram = topPrograms[0];
  const events = assessmentData.hyroxEventsCompleted || 0;
  const background = assessmentData.primaryTrainingBackground || 'general';
  
  let explanation = `Based on your profile (${events} HYROX events, ${background} background), `;
  explanation += `we recommend a ${topProgram.metadata.difficulty} level program in the ${topProgram.metadata.category} category. `;
  
  explanation += `This program matches your preferred difficulty (${userProfile.preferredDifficulty}) `;
  explanation += `and fits your available training schedule (${topProgram.metadata.frequency} workouts/week vs your ${userProfile.availableFrequency} available days). `;
  
  if (topPrograms.length > 1) {
    explanation += `Alternative options include ${topPrograms[1].metadata.category} programs `;
    if (topPrograms.length > 2) {
      explanation += `and ${topPrograms[2].metadata.category} training. `;
    }
  }
  
  explanation += `The program focuses on ${topProgram.metadata.raceCategory.toLowerCase()} competition preparation.`;
  
  return explanation;
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

// Helper function to convert database programs to metadata format
export function convertProgramToMetadata(program: any): ProgramMetadata {
  // Normalize difficulty
  let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
  const difficultyStr = (program.difficulty || '').toLowerCase();
  if (difficultyStr.includes('beginner')) difficulty = 'Beginner';
  else if (difficultyStr.includes('advanced')) difficulty = 'Advanced';
  else difficulty = 'Intermediate';

  // Normalize category
  let category: 'Hyrox' | 'Strength' | 'Running' | 'Mixed' = 'Hyrox';
  const categoryStr = (program.category || '').toLowerCase();
  if (categoryStr.includes('strength')) category = 'Strength';
  else if (categoryStr.includes('running')) category = 'Running';
  else if (categoryStr.includes('mixed')) category = 'Mixed';
  else category = 'Hyrox';

  // Normalize race category
  let raceCategory: 'Singles' | 'Doubles/Relay' = 'Singles';
  const raceCategoryStr = (program.racecategory || program.raceCategory || '').toLowerCase();
  if (raceCategoryStr.includes('doubles') || raceCategoryStr.includes('relay')) {
    raceCategory = 'Doubles/Relay';
  }

  return {
    difficulty,
    frequency: program.frequency || 4,
    category,
    raceCategory
  };
}

// Updated main function using new metadata-based algorithm
export function selectHyroxProgram(
  assessmentData: AssessmentData,
  availablePrograms?: Array<{ program: any; metadata: ProgramMetadata }>
): ProgramRecommendation {
  try {
    // Validate input data
    if (!assessmentData) {
      throw new Error("Assessment data is required");
    }

    // If no programs provided, use legacy approach as fallback
    if (!availablePrograms || availablePrograms.length === 0) {
      console.log("Using legacy program selection (no database programs provided)");
      
      const userProfile = generateUserProfile(assessmentData);
      const legacyPrograms = Object.values(HYROX_PROGRAMS);
      
      // Convert legacy programs to new format
      const convertedPrograms = legacyPrograms.map(program => ({
        program,
        metadata: {
          difficulty: program.name.includes('Beginner') ? 'Beginner' as const :
                     program.name.includes('Advanced') ? 'Advanced' as const : 'Intermediate' as const,
          frequency: 4, // Default frequency
          category: program.name.includes('Strength') ? 'Strength' as const :
                   program.name.includes('Runner') ? 'Running' as const :
                   program.name.includes('Doubles') ? 'Hyrox' as const : 'Hyrox' as const,
          raceCategory: program.name.includes('Doubles') ? 'Doubles/Relay' as const : 'Singles' as const
        }
      }));
      
      return recommendPrograms(assessmentData, convertedPrograms);
    }

    // Validate available programs
    const validPrograms = availablePrograms.filter(p => 
      p && p.program && p.metadata && p.program.id
    );

    if (validPrograms.length === 0) {
      throw new Error("No valid programs available");
    }

    // Use new metadata-based algorithm
    return recommendPrograms(assessmentData, validPrograms);
    
  } catch (error) {
    console.error("Error in selectHyroxProgram:", error);
    console.error("Assessment data:", JSON.stringify(assessmentData, null, 2));
    console.error("Available programs count:", availablePrograms?.length || 0);
    
    // Robust fallback with comprehensive error logging
    try {
      const userProfile = generateUserProfile(assessmentData);
      const fallbackProgram = availablePrograms?.[0] || {
        program: HYROX_PROGRAMS[DEFAULT_PROGRAM_ID],
        metadata: {
          difficulty: 'Intermediate' as const,
          frequency: 4,
          category: 'Hyrox' as const,
          raceCategory: 'Singles' as const
        }
      };
      
      return {
        recommendedPrograms: [scoreProgram(
          fallbackProgram.program, 
          fallbackProgram.metadata, 
          userProfile
        )],
        userProfile,
        modifications: [],
        reasoningExplanation: `An error occurred during program selection: ${error instanceof Error ? error.message : 'Unknown error'}. A default program has been assigned.`,
        // Legacy compatibility fields
        recommendedProgram: fallbackProgram.program,
        experienceLevel: userProfile.preferredDifficulty,
        trainingBackground: userProfile.preferredCategory,
        timeAvailability: `${userProfile.availableFrequency} days/week`,
        specialCategory: userProfile.preferredRaceCategory,
        fitnessProfile: {
          runningCapacity: 5,
          strengthFoundation: 5,
          movementQuality: 5,
          workCapacity: 5,
          stationEfficiency: 5
        }
      };
    } catch (fallbackError) {
      console.error("Critical error: Fallback program selection also failed:", fallbackError);
      throw new Error("Program selection system unavailable");
    }
  }
}