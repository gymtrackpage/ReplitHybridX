// Program Phase Management System - Based on Google Apps Script implementation
import { storage } from "./storage";
import { HYROX_PROGRAMS } from "./programSelection";

export interface ProgramPhaseInfo {
  phase: 'PREP' | 'MAIN' | 'MAINTENANCE';
  currentProgramId: number;
  currentWeek: number;
  currentDay: number;
  startDate: Date;
  eventDate?: Date;
  mainProgramStartDate?: Date;
  virtualStartDate?: Date;
  eventCompleted?: boolean;
}

const DEFAULT_PROGRAM_ID = "IntermediateProgram";
const MAIN_PROGRAM_TOTAL_WEEKS = 14;
const PREP_CYCLE_WEEKS = 4;
const MAINTENANCE_CYCLE_WEEKS = 4;

/**
 * Calculates the initial program state for a user when they register or change programs/event dates.
 */
export async function calculateInitialProgramState(programId: string, eventDate: Date | null): Promise<ProgramPhaseInfo> {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  let normalizedEventDate = null;
  if (eventDate) {
    normalizedEventDate = new Date(eventDate);
    normalizedEventDate.setHours(0, 0, 0, 0);
  }

  let programPhase: 'PREP' | 'MAIN' | 'MAINTENANCE' = "MAIN";
  let currentWeek = 0;
  let currentDay = 0;
  let startDate = new Date(currentDate);
  let virtualStartDate = new Date(currentDate);
  let mainProgramStartDate = null;
  let eventCompleted = false;

  const selectedProgramDetails = HYROX_PROGRAMS[programId] || HYROX_PROGRAMS[DEFAULT_PROGRAM_ID];
  const programTotalWeeks = selectedProgramDetails.totalWeeks || MAIN_PROGRAM_TOTAL_WEEKS;

  if (normalizedEventDate) {
    const daysUntilEvent = Math.floor((normalizedEventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent < 0) {
      // Event has passed
      eventCompleted = true;
      programPhase = "MAINTENANCE";
      const daysSinceEvent = Math.abs(daysUntilEvent);
      const weeksSinceEvent = Math.floor(daysSinceEvent / 7);
      
      currentWeek = weeksSinceEvent % MAINTENANCE_CYCLE_WEEKS;
      currentDay = daysSinceEvent % 7;
      
      const weeksBackFromEvent = Math.floor(weeksSinceEvent / MAINTENANCE_CYCLE_WEEKS) * MAINTENANCE_CYCLE_WEEKS;
      startDate = new Date(normalizedEventDate.getTime() + (weeksBackFromEvent * 7 * 24 * 60 * 60 * 1000));
      
    } else if (daysUntilEvent < programTotalWeeks * 7) {
      // Within main program timeframe
      programPhase = "MAIN";
      mainProgramStartDate = new Date(normalizedEventDate.getTime() - (programTotalWeeks * 7 * 24 * 60 * 60 * 1000));
      
      const daysSinceMainStart = Math.floor((currentDate.getTime() - mainProgramStartDate.getTime()) / (1000 * 60 * 60 * 24));
      currentWeek = Math.floor(daysSinceMainStart / 7);
      currentDay = daysSinceMainStart % 7;
      
      startDate = new Date(mainProgramStartDate);
      virtualStartDate = new Date(mainProgramStartDate);
      
    } else {
      // Need prep phase
      programPhase = "PREP";
      const totalPrepWeeks = Math.ceil((daysUntilEvent - (programTotalWeeks * 7)) / 7);
      const completePrepCycles = Math.floor(totalPrepWeeks / PREP_CYCLE_WEEKS);
      
      currentWeek = totalPrepWeeks % PREP_CYCLE_WEEKS;
      currentDay = daysUntilEvent % 7;
      
      mainProgramStartDate = new Date(normalizedEventDate.getTime() - (programTotalWeeks * 7 * 24 * 60 * 60 * 1000));
      startDate = new Date(currentDate.getTime() - (currentWeek * 7 + currentDay) * 24 * 60 * 60 * 1000);
      virtualStartDate = new Date(mainProgramStartDate.getTime() - (totalPrepWeeks * 7 * 24 * 60 * 60 * 1000));
    }
  }

  return {
    phase: programPhase,
    currentProgramId: await getProgramIdByName(programId),
    currentWeek,
    currentDay,
    startDate,
    eventDate: normalizedEventDate,
    mainProgramStartDate,
    virtualStartDate,
    eventCompleted
  };
}

async function getProgramIdByName(programName: string): Promise<number> {
  const programs = await storage.getPrograms();
  const program = programs.find(p => p.name.includes(programName) || p.id === parseInt(programName));
  return program?.id || 1; // Default to first program
}

/**
 * Determines the recommended prep program based on the main program
 */
async function getRecommendedPrepProgram(userId: string, mainProgram: any): Promise<string> {
  const user = await storage.getUser(userId);
  if (!user) return "BeginnerProgram";

  // Logic based on main program difficulty and user profile
  if (mainProgram.difficulty === "advanced") {
    return "IntermediateProgram";
  } else if (mainProgram.difficulty === "intermediate") {
    return "BeginnerProgram";
  }
  return "BeginnerProgram";
}

/**
 * Gets the recommended maintenance program
 */
async function getRecommendedMaintenanceProgram(userId: string): Promise<string> {
  return "MaintenanceProgram";
}

/**
 * Checks if a user should transition to a new phase
 */
export async function checkForPhaseTransition(userId: string): Promise<{ shouldTransition: boolean; newPhase?: ProgramPhaseInfo }> {
  const progress = await storage.getUserProgress(userId);
  if (!progress) {
    return { shouldTransition: false };
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const startDate = new Date(progress.startDate);
  const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.floor(daysSinceStart / 7);

  // Check if we need to transition phases based on event date and current progress
  if (progress.eventDate) {
    const eventDate = new Date(progress.eventDate);
    const daysUntilEvent = Math.floor((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Transition from PREP to MAIN (14 weeks before event)
    if (progress.phase === 'PREP' && daysUntilEvent <= MAIN_PROGRAM_TOTAL_WEEKS * 7) {
      const mainProgram = await storage.getProgram(progress.programId);
      if (mainProgram) {
        const newPhase = await calculateInitialProgramState(mainProgram.name, eventDate);
        return { shouldTransition: true, newPhase };
      }
    }

    // Transition from MAIN to MAINTENANCE (after event)
    if (progress.phase === 'MAIN' && daysUntilEvent < 0) {
      const newPhase = await calculateInitialProgramState("MaintenanceProgram", eventDate);
      return { shouldTransition: true, newPhase };
    }
  }

  // Check if current program cycle is complete
  const currentProgram = await storage.getProgram(progress.programId);
  if (currentProgram && currentWeek >= currentProgram.totalWeeks) {
    if (progress.phase === 'PREP') {
      // Start a new prep cycle
      const newPhase = await calculateInitialProgramState(currentProgram.name, progress.eventDate);
      return { shouldTransition: true, newPhase };
    } else if (progress.phase === 'MAINTENANCE') {
      // Start a new maintenance cycle
      const newPhase = await calculateInitialProgramState("MaintenanceProgram", progress.eventDate);
      return { shouldTransition: true, newPhase };
    }
  }

  return { shouldTransition: false };
}

/**
 * Transitions a user to a new phase
 */
export async function transitionUserToPhase(userId: string, phaseInfo: ProgramPhaseInfo): Promise<void> {
  await storage.updateUserProgress(userId, {
    programId: phaseInfo.currentProgramId,
    currentWeek: phaseInfo.currentWeek,
    currentDay: phaseInfo.currentDay,
    startDate: phaseInfo.startDate,
    phase: phaseInfo.phase,
    eventDate: phaseInfo.eventDate,
    mainProgramStartDate: phaseInfo.mainProgramStartDate
  });
}

/**
 * Calculates total workouts in a program
 */
async function calculateTotalWorkouts(programId: number): Promise<number> {
  const workouts = await storage.getWorkoutsByProgram(programId);
  return workouts.length;
}

/**
 * Determines the current program phase for a user
 */
export async function determineUserProgramPhase(userId: string, eventDate: Date | null, selectedProgramId: number): Promise<ProgramPhaseInfo> {
  const program = await storage.getProgram(selectedProgramId);
  const programName = program?.name || "IntermediateProgram";
  
  return await calculateInitialProgramState(programName, eventDate);
}