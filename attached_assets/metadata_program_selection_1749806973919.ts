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
}

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
  
  let scores = {
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
    reasoningExplanation
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

// === USAGE EXAMPLE ===

export function selectHyroxProgram(
  assessmentData: AssessmentData,
  availablePrograms: Array<{ program: any; metadata: ProgramMetadata }>
): ProgramRecommendation {
  try {
    return recommendPrograms(assessmentData, availablePrograms);
  } catch (error) {
    console.error("Error in selectHyroxProgram:", error);
    
    // Fallback to first available program
    const fallbackProgram = availablePrograms[0];
    return {
      recommendedPrograms: fallbackProgram ? [scoreProgram(
        fallbackProgram.program, 
        fallbackProgram.metadata, 
        generateUserProfile(assessmentData)
      )] : [],
      userProfile: generateUserProfile(assessmentData),
      modifications: [],
      reasoningExplanation: "An error occurred during program selection. A default program has been assigned."
    };
  }
}