import { db } from "./db";
import { storage } from "./storage";

export interface ProgramPhaseInfo {
  phase: 'PREP' | 'MAIN' | 'MAINTENANCE';
  currentProgramId: number;
  currentWeek: number;
  currentDay: number;
  startDate: Date;
  eventDate?: Date;
  mainProgramStartDate?: Date;
}

export async function determineUserProgramPhase(userId: string, eventDate: Date | null, selectedProgramId: number): Promise<ProgramPhaseInfo> {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Get the selected main program
  const mainProgram = await storage.getProgram(selectedProgramId);
  if (!mainProgram) {
    throw new Error("Selected program not found");
  }

  const mainProgramDuration = mainProgram.duration || 14; // weeks
  const mainProgramDays = mainProgramDuration * 7;

  // No event date - start main program immediately
  if (!eventDate) {
    return {
      phase: 'MAIN',
      currentProgramId: selectedProgramId,
      currentWeek: 1,
      currentDay: 1,
      startDate: currentDate
    };
  }

  const eventDateTime = new Date(eventDate);
  eventDateTime.setHours(0, 0, 0, 0);
  
  const daysUntilEvent = Math.floor((eventDateTime.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

  // Event has passed - use maintenance program
  if (daysUntilEvent < 0) {
    const maintenanceProgram = await getRecommendedMaintenanceProgram(userId);
    return {
      phase: 'MAINTENANCE',
      currentProgramId: maintenanceProgram.id,
      currentWeek: 1,
      currentDay: 1,
      startDate: currentDate,
      eventDate: eventDateTime
    };
  }

  // Event is within main program duration - start main program at appropriate point
  if (daysUntilEvent <= mainProgramDays) {
    const daysIntoProgram = mainProgramDays - daysUntilEvent;
    const currentWeek = Math.floor(daysIntoProgram / 7) + 1;
    const currentDay = (daysIntoProgram % 7) + 1;
    
    const programStartDate = new Date(currentDate);
    programStartDate.setDate(currentDate.getDate() - daysIntoProgram);

    return {
      phase: 'MAIN',
      currentProgramId: selectedProgramId,
      currentWeek: Math.max(1, currentWeek),
      currentDay: Math.max(1, currentDay),
      startDate: programStartDate,
      eventDate: eventDateTime
    };
  }

  // Event is far away - start with prep program
  const prepProgram = await getRecommendedPrepProgram(userId, mainProgram);
  const mainProgramStartDate = new Date(eventDateTime);
  mainProgramStartDate.setDate(eventDateTime.getDate() - mainProgramDays);

  return {
    phase: 'PREP',
    currentProgramId: prepProgram.id,
    currentWeek: 1,
    currentDay: 1,
    startDate: currentDate,
    eventDate: eventDateTime,
    mainProgramStartDate
  };
}

async function getRecommendedPrepProgram(userId: string, mainProgram: any) {
  const programs = await storage.getPrograms();
  
  // Try to match prep program to main program type
  let prepProgram = programs.find(p => 
    p.name?.toLowerCase().includes('prep') && 
    p.name?.toLowerCase().includes('hyrox')
  );

  // Fallback to any prep program
  if (!prepProgram) {
    prepProgram = programs.find(p => p.name?.toLowerCase().includes('prep'));
  }

  // Fallback to a basic program
  if (!prepProgram) {
    prepProgram = programs.find(p => p.name?.toLowerCase().includes('beginner'));
  }

  if (!prepProgram) {
    throw new Error("No suitable prep program found");
  }

  return prepProgram;
}

async function getRecommendedMaintenanceProgram(userId: string) {
  const programs = await storage.getPrograms();
  
  // Find maintenance program
  let maintenanceProgram = programs.find(p => 
    p.name?.toLowerCase().includes('maintain') && 
    p.name?.toLowerCase().includes('hyrox')
  );

  // Fallback to any maintenance program
  if (!maintenanceProgram) {
    maintenanceProgram = programs.find(p => p.name?.toLowerCase().includes('maintain'));
  }

  // Fallback to a basic program
  if (!maintenanceProgram) {
    maintenanceProgram = programs.find(p => p.name?.toLowerCase().includes('beginner'));
  }

  if (!maintenanceProgram) {
    throw new Error("No suitable maintenance program found");
  }

  return maintenanceProgram;
}

export async function checkForPhaseTransition(userId: string): Promise<{ shouldTransition: boolean; newPhase?: ProgramPhaseInfo }> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { shouldTransition: false };
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check if user has an event date and current program info
  if (!user.hyroxEventDate || !user.currentProgramId) {
    return { shouldTransition: false };
  }

  const progress = await storage.getUserProgress(userId);
  if (!progress) {
    return { shouldTransition: false };
  }

  const currentProgram = await storage.getProgram(user.currentProgramId);
  if (!currentProgram) {
    return { shouldTransition: false };
  }

  const eventDate = new Date(user.hyroxEventDate);
  eventDate.setHours(0, 0, 0, 0);

  // Check if we need to transition from PREP to MAIN
  if (currentProgram.programType === 'prep') {
    const mainProgramStartDate = new Date(eventDate);
    mainProgramStartDate.setDate(eventDate.getDate() - (14 * 7)); // 14 weeks before event

    if (currentDate >= mainProgramStartDate) {
      // Find the user's selected main program
      const programs = await storage.getPrograms();
      const mainProgram = programs.find(p => p.programType === 'main' && p.difficulty === user.fitnessLevel?.toLowerCase());
      
      if (mainProgram) {
        const newPhase = await determineUserProgramPhase(userId, eventDate, mainProgram.id);
        return { shouldTransition: true, newPhase };
      }
    }
  }

  // Check if we need to transition from MAIN to MAINTENANCE
  if (currentProgram.programType === 'main') {
    // Check if event date has passed
    if (currentDate > eventDate) {
      const newPhase = await determineUserProgramPhase(userId, eventDate, user.currentProgramId);
      return { shouldTransition: true, newPhase };
    }

    // Check if program duration is complete
    const programDuration = currentProgram.duration || 14;
    if (progress.currentWeek > programDuration) {
      const newPhase = await determineUserProgramPhase(userId, eventDate, user.currentProgramId);
      return { shouldTransition: true, newPhase };
    }
  }

  return { shouldTransition: false };
}

export async function transitionUserToPhase(userId: string, phaseInfo: ProgramPhaseInfo) {
  try {
    // Update user's current program
    await storage.updateUserProgram(userId, phaseInfo.currentProgramId);

    // Update or create progress tracking
    const existingProgress = await storage.getUserProgress(userId);
    if (existingProgress) {
      await storage.updateUserProgress(userId, {
        programId: phaseInfo.currentProgramId,
        currentWeek: phaseInfo.currentWeek,
        currentDay: phaseInfo.currentDay,
        completedWorkouts: 0, // Reset for new phase
        totalWorkouts: await calculateTotalWorkouts(phaseInfo.currentProgramId),
      });
    } else {
      await storage.createUserProgress({
        userId,
        programId: phaseInfo.currentProgramId,
        currentWeek: phaseInfo.currentWeek,
        currentDay: phaseInfo.currentDay,
        completedWorkouts: 0,
        totalWorkouts: await calculateTotalWorkouts(phaseInfo.currentProgramId),
      });
    }

    console.log(`User ${userId} transitioned to ${phaseInfo.phase} phase with program ${phaseInfo.currentProgramId}`);
    return true;
  } catch (error) {
    console.error("Error transitioning user to new phase:", error);
    return false;
  }
}

async function calculateTotalWorkouts(programId: number): Promise<number> {
  const workouts = await storage.getWorkoutsByProgram(programId);
  return workouts.length;
}