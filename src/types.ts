export type ExerciseType =
  | "reps"
  | "time"
  | "weight_reps"
  | "distance"
  | "carry"
  | "sprint"
  | "jump"
  | "note";

export type Phase = "exercise" | "rest";

export type DistanceUnit = "m" | "cm";

export interface Exercise {
  id: string;
  progressKey?: string;
  name: string;
  type: ExerciseType;
  sets: number;
  repsMin?: number;
  repsMax?: number;
  secondsMin?: number;
  secondsMax?: number;
  weightKg?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  restSeconds?: number;
  supersetGroup?: string;
  optionGroup?: string;
  optionLabel?: string;
  isBareMinimum?: boolean;
  isOptional?: boolean;
  isMustTrack?: boolean;
  notes?: string;
}

export interface Section {
  name: string;
  exercises: Exercise[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  day: string;
  sections: Section[];
}

export interface ExerciseValue {
  reps?: number;
  seconds?: number;
  weightKg?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  note?: string;
}

export interface PlannedExercise {
  sectionName: string;
  exercise: Exercise;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  progressKey?: string;
  exerciseName: string;
  sectionName: string;
  setNumber: number;
  type: ExerciseType;
  targetValue: ExerciseValue;
  actualValue: ExerciseValue;
  isMustTrack: boolean;
  status: "done" | "skipped";
  completedAt: number;
  notes?: string;
}

export interface WorkoutHistory {
  id: string;
  workoutId: string;
  workoutName: string;
  bareMinimum: boolean;
  startedAt: number;
  completedAt: number;
  durationSeconds: number;
  logs: ExerciseLog[];
}

export interface ProgressionSuggestion {
  progressKey: string;
  exerciseName: string;
  updatedAt: number;
  nextValues: ExerciseValue[];
  message: string;
}

export interface ActiveWorkoutState {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  bareMinimum: boolean;
  plan: PlannedExercise[];
  createdAt: number;
  startedAt: number | null;
  totalPausedMs: number;
  pauseStartedAt: number | null;
  isRunning: boolean;
  currentIndex: number;
  currentSet: number;
  phase: Phase;
  phaseStartedAt: number | null;
  phasePausedMs: number;
  phasePauseStartedAt: number | null;
  restAdjustmentSeconds?: number;
  values: Record<string, ExerciseValue>;
  logs: ExerciseLog[];
}
