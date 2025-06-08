import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Target, Zap, Users, AlertTriangle, CheckCircle } from "lucide-react";

interface Exercise {
  name: string;
  sets?: number | string;
  reps?: number | string;
  duration?: string;
  distance?: string;
  weight?: string;
  load?: string;
  rpe?: number | string;
  rest?: string;
  tempo?: string;
  type?: string;
  intensity?: string;
  pace?: string;
  zone?: string;
  cadence?: string;
  rounds?: number | string;
  target?: string;
  equipment?: string;
  description?: string;
  notes?: string;
}

interface ExerciseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
}

// Exercise database with detailed information
const EXERCISE_DATABASE: Record<string, {
  description: string;
  instructions: string[];
  muscleGroups: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string[];
  alternatives: string[];
  safetyTips: string[];
  hyroxRelevance?: string;
}> = {
  // Running exercises
  "1km Run": {
    description: "Standard 1km distance run - a core component of Hyrox racing",
    instructions: [
      "Maintain steady breathing throughout",
      "Keep a consistent pace you can sustain",
      "Land on midfoot with slight forward lean",
      "Keep arms relaxed at 90-degree angle"
    ],
    muscleGroups: ["Cardiovascular", "Legs", "Core"],
    difficulty: "Beginner",
    equipment: ["Running shoes", "Timer"],
    alternatives: ["Rowing 1250m", "Ski Erg 1250m", "Assault Bike 2km"],
    safetyTips: ["Warm up properly", "Stay hydrated", "Listen to your body"],
    hyroxRelevance: "Each Hyrox race includes 8x 1km runs between functional stations"
  },
  "800m Run": {
    description: "Medium distance run for building aerobic capacity",
    instructions: [
      "Start at moderate pace",
      "Gradually increase intensity",
      "Focus on breathing rhythm",
      "Finish strong in final 200m"
    ],
    muscleGroups: ["Cardiovascular", "Legs"],
    difficulty: "Beginner",
    equipment: ["Running shoes", "Timer"],
    alternatives: ["1000m Row", "1000m Ski Erg"],
    safetyTips: ["Proper warm-up essential", "Cool down after"],
    hyroxRelevance: "Builds endurance for Hyrox running segments"
  },
  
  // Burpee variations
  "Burpee Broad Jumps": {
    description: "Explosive full-body movement combining burpee with forward jump",
    instructions: [
      "Start standing, drop to plank position",
      "Perform push-up (chest to ground)",
      "Jump feet to hands explosively",
      "Jump forward as far as possible",
      "Land softly and immediately repeat"
    ],
    muscleGroups: ["Full Body", "Chest", "Legs", "Core"],
    difficulty: "Intermediate",
    equipment: ["Open space", "Exercise mat"],
    alternatives: ["Regular Burpees", "Burpee Box Jump Overs", "Mountain Climbers"],
    safetyTips: ["Land softly", "Keep core engaged", "Don't rush - maintain form"],
    hyroxRelevance: "Station 2 in Hyrox - 80m of burpee broad jumps"
  },
  "Burpees": {
    description: "Classic full-body conditioning exercise",
    instructions: [
      "Start standing with feet hip-width apart",
      "Drop hands to floor, jump feet back to plank",
      "Perform push-up lowering chest to ground",
      "Jump feet back to hands",
      "Jump up with arms overhead"
    ],
    muscleGroups: ["Full Body", "Chest", "Shoulders", "Legs", "Core"],
    difficulty: "Beginner",
    equipment: ["Exercise mat"],
    alternatives: ["Half Burpees", "Burpee Box Step-ups", "Squat Thrusts"],
    safetyTips: ["Control the descent", "Keep wrists aligned", "Modify if needed"],
    hyroxRelevance: "Variation of Hyrox Station 2 movement pattern"
  },

  // Sled exercises
  "Sled Push": {
    description: "Heavy sled push for building lower body power and conditioning",
    instructions: [
      "Place hands on sled handles, lean forward 45 degrees",
      "Keep core tight and back straight",
      "Drive through legs with short, powerful steps",
      "Maintain consistent pressure on handles",
      "Keep head up and eyes forward"
    ],
    muscleGroups: ["Legs", "Glutes", "Core", "Shoulders"],
    difficulty: "Intermediate",
    equipment: ["Prowler sled", "Weight plates"],
    alternatives: ["Weighted Squats", "Wall Sit", "Leg Press"],
    safetyTips: ["Keep back neutral", "Don't overload initially", "Wear proper shoes"],
    hyroxRelevance: "Station 3 - 50m sled push at bodyweight"
  },
  "Sled Pull": {
    description: "Backward sled pull focusing on posterior chain strength",
    instructions: [
      "Face sled, grab rope with both hands",
      "Lean back slightly, engage core",
      "Pull with alternating hand-over-hand motion",
      "Keep chest up and shoulders back",
      "Maintain steady backward movement"
    ],
    muscleGroups: ["Back", "Biceps", "Core", "Legs"],
    difficulty: "Intermediate",
    equipment: ["Sled", "Rope", "Weight plates"],
    alternatives: ["Rowing", "Lat Pulldowns", "Reverse Flyes"],
    safetyTips: ["Control the weight", "Keep rope taught", "Watch for obstacles behind"],
    hyroxRelevance: "Station 7 - 50m sled pull at bodyweight"
  },

  // Farmer carries
  "Farmers Carry": {
    description: "Functional strength exercise carrying heavy weights",
    instructions: [
      "Pick up weights with neutral grip",
      "Stand tall with shoulders back",
      "Keep core engaged throughout",
      "Walk with normal gait pattern",
      "Maintain grip until completion"
    ],
    muscleGroups: ["Forearms", "Traps", "Core", "Legs"],
    difficulty: "Beginner",
    equipment: ["Kettlebells", "Dumbbells", "Farmer's handles"],
    alternatives: ["Suitcase Carry", "Overhead Carry", "Front-loaded Carry"],
    safetyTips: ["Secure grip", "Keep weights balanced", "Clear path ahead"],
    hyroxRelevance: "Station 6 - 200m farmers carry with kettlebells"
  },

  // Kettlebell exercises
  "Kettlebell Swings": {
    description: "Explosive hip-hinge movement for posterior chain development",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Hinge at hips, grab kettlebell with both hands",
      "Drive hips forward explosively",
      "Let kettlebell swing to chest height",
      "Control descent by hinging hips back"
    ],
    muscleGroups: ["Glutes", "Hamstrings", "Core", "Shoulders"],
    difficulty: "Intermediate",
    equipment: ["Kettlebell"],
    alternatives: ["Goblet Squats", "Hip Thrusts", "Deadlifts"],
    safetyTips: ["Hip drive, not arm lift", "Keep back neutral", "Control the weight"],
    hyroxRelevance: "Builds power for sled movements and overall conditioning"
  },

  // Sandbag exercises
  "Sandbag Lunges": {
    description: "Weighted lunges carrying sandbag for functional strength",
    instructions: [
      "Hold sandbag in front-loaded position",
      "Step forward into lunge position",
      "Lower until both knees at 90 degrees",
      "Push through front heel to return",
      "Alternate legs with each rep"
    ],
    muscleGroups: ["Quads", "Glutes", "Core", "Calves"],
    difficulty: "Intermediate",
    equipment: ["Sandbag"],
    alternatives: ["Bodyweight Lunges", "Goblet Lunges", "Walking Lunges"],
    safetyTips: ["Keep torso upright", "Control the descent", "Don't let knee cave in"],
    hyroxRelevance: "Station 8 - 100m sandbag lunges"
  },

  // Wall balls
  "Wall Balls": {
    description: "Explosive squat-to-overhead throw movement",
    instructions: [
      "Hold medicine ball at chest level",
      "Squat down keeping chest up",
      "Drive up explosively through legs",
      "Throw ball to target overhead",
      "Catch ball and immediately squat"
    ],
    muscleGroups: ["Legs", "Core", "Shoulders", "Arms"],
    difficulty: "Intermediate",
    equipment: ["Medicine ball", "Wall target"],
    alternatives: ["Goblet Squats", "Thrusters", "Squat Jumps"],
    safetyTips: ["Watch the ball", "Use legs not arms", "Clear area around you"],
    hyroxRelevance: "Station 4 - 75 wall balls to 9ft target"
  },

  // Rowing
  "Rowing": {
    description: "Full-body cardio exercise on rowing machine",
    instructions: [
      "Sit with knees bent, grab handle",
      "Drive with legs first, then lean back",
      "Pull handle to lower ribs",
      "Extend arms, lean forward, bend knees to return",
      "Maintain smooth rhythm throughout"
    ],
    muscleGroups: ["Back", "Legs", "Core", "Arms"],
    difficulty: "Beginner",
    equipment: ["Rowing machine"],
    alternatives: ["Pull-ups", "Bent-over rows", "Lat pulldowns"],
    safetyTips: ["Legs-back-arms sequence", "Don't round back", "Control the return"],
    hyroxRelevance: "Station 5 - 1000m row"
  },

  // Ski Erg
  "Ski Erg": {
    description: "Upper body cardio exercise mimicking skiing motion",
    instructions: [
      "Stand tall, grab handles overhead",
      "Pull down explosively using core and arms",
      "Let handles return smoothly overhead",
      "Engage core throughout movement",
      "Maintain steady rhythm"
    ],
    muscleGroups: ["Core", "Lats", "Triceps", "Shoulders"],
    difficulty: "Beginner",
    equipment: ["Ski Erg machine"],
    alternatives: ["Pull-ups", "Lat pulldowns", "Mountain climbers"],
    safetyTips: ["Don't lean too far forward", "Control the return", "Keep core tight"],
    hyroxRelevance: "Station 1 - 1000m Ski Erg"
  }
};

export function ExerciseDetailModal({ isOpen, onClose, exercise }: ExerciseDetailModalProps) {
  if (!exercise) return null;

  const exerciseData = EXERCISE_DATABASE[exercise.name] || {
    description: exercise.description || "No detailed information available for this exercise.",
    instructions: ["Perform as instructed by your coach", "Focus on proper form"],
    muscleGroups: ["Various"],
    difficulty: "Intermediate" as const,
    equipment: ["Various"],
    alternatives: ["Consult your trainer for alternatives"],
    safetyTips: ["Warm up properly", "Use proper form", "Progress gradually"],
    hyroxRelevance: "Part of comprehensive Hyrox training"
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{exercise.name}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Exercise Parameters */}
            {(exercise.sets || exercise.reps || exercise.duration || exercise.distance || exercise.weight) && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Exercise Parameters</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {exercise.sets && <div><span className="text-muted-foreground">Sets:</span> {exercise.sets}</div>}
                  {exercise.reps && <div><span className="text-muted-foreground">Reps:</span> {exercise.reps}</div>}
                  {exercise.duration && <div><span className="text-muted-foreground">Duration:</span> {exercise.duration}</div>}
                  {exercise.distance && <div><span className="text-muted-foreground">Distance:</span> {exercise.distance}</div>}
                  {exercise.weight && <div><span className="text-muted-foreground">Weight:</span> {exercise.weight}</div>}
                  {exercise.load && <div><span className="text-muted-foreground">Load:</span> {exercise.load}</div>}
                  {exercise.rpe && <div><span className="text-muted-foreground">RPE:</span> {exercise.rpe}</div>}
                  {exercise.rest && <div><span className="text-muted-foreground">Rest:</span> {exercise.rest}</div>}
                  {exercise.zone && <div><span className="text-muted-foreground">Zone:</span> {exercise.zone}</div>}
                  {exercise.cadence && <div><span className="text-muted-foreground">Cadence:</span> {exercise.cadence}</div>}
                </div>
              </div>
            )}

            {/* Exercise Info Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getDifficultyColor(exerciseData.difficulty)}>
                <Target className="w-3 h-3 mr-1" />
                {exerciseData.difficulty}
              </Badge>
              {exerciseData.hyroxRelevance && (
                <Badge variant="secondary">
                  <Zap className="w-3 h-3 mr-1" />
                  Hyrox Station
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{exerciseData.description}</p>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {exerciseData.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>

            {/* Muscle Groups */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Muscle Groups
              </h3>
              <div className="flex flex-wrap gap-1">
                {exerciseData.muscleGroups.map((group, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {group}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h3 className="font-semibold mb-2">Equipment Needed</h3>
              <div className="flex flex-wrap gap-1">
                {exerciseData.equipment.map((item, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hyrox Relevance */}
            {exerciseData.hyroxRelevance && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center text-blue-800 dark:text-blue-200">
                  <Zap className="w-4 h-4 mr-2" />
                  Hyrox Relevance
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">{exerciseData.hyroxRelevance}</p>
              </div>
            )}

            <Separator />

            {/* Alternatives */}
            <div>
              <h3 className="font-semibold mb-2">Alternative Exercises</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                {exerciseData.alternatives.map((alt, index) => (
                  <div key={index}>• {alt}</div>
                ))}
              </div>
            </div>

            {/* Safety Tips */}
            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center text-orange-800 dark:text-orange-200">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Safety Tips
              </h3>
              <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                {exerciseData.safetyTips.map((tip, index) => (
                  <div key={index}>• {tip}</div>
                ))}
              </div>
            </div>

            {/* Exercise Notes */}
            {(exercise.description || exercise.notes) && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Exercise Notes</h3>
                {exercise.description && exercise.description !== exercise.name && (
                  <p className="text-sm text-muted-foreground mb-2 italic">{exercise.description}</p>
                )}
                {exercise.notes && (
                  <p className="text-sm text-muted-foreground italic">Notes: {exercise.notes}</p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}