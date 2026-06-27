import {
  ActiveWorkoutState,
  ProgressionSuggestion,
  WorkoutDay,
  WorkoutHistory,
} from "./types";
import { DEFAULT_WORKOUTS } from "./workouts";

const WORKOUTS_KEY = "workout-tracker.workouts.v4";
const ACTIVE_KEY = "workout-tracker.active.v4";
const HISTORY_KEY = "workout-tracker.history.v1";
const PROGRESSION_KEY = "workout-tracker.progression.v1";
const BARE_MINIMUM_KEY = "workout-tracker.bare-minimum.v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadWorkouts(): WorkoutDay[] {
  const saved = readJson<WorkoutDay[] | null>(WORKOUTS_KEY, null);
  return Array.isArray(saved) ? saved : DEFAULT_WORKOUTS;
}

export function saveWorkouts(workouts: WorkoutDay[]): void {
  writeJson(WORKOUTS_KEY, workouts);
}

export function resetWorkouts(): WorkoutDay[] {
  window.localStorage.removeItem(WORKOUTS_KEY);
  return DEFAULT_WORKOUTS;
}

export function loadActiveWorkout(): ActiveWorkoutState | null {
  return readJson<ActiveWorkoutState | null>(ACTIVE_KEY, null);
}

export function saveActiveWorkout(active: ActiveWorkoutState | null): void {
  if (active) {
    writeJson(ACTIVE_KEY, active);
  } else {
    window.localStorage.removeItem(ACTIVE_KEY);
  }
}

export function loadHistory(): WorkoutHistory[] {
  const saved = readJson<WorkoutHistory[]>(HISTORY_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

export function saveHistory(history: WorkoutHistory[]): void {
  writeJson(HISTORY_KEY, history);
}

export function loadProgressions(): Record<string, ProgressionSuggestion> {
  const saved = readJson<Record<string, ProgressionSuggestion>>(PROGRESSION_KEY, {});
  return saved && typeof saved === "object" ? saved : {};
}

export function saveProgressions(
  progressions: Record<string, ProgressionSuggestion>,
): void {
  writeJson(PROGRESSION_KEY, progressions);
}

export function loadBareMinimum(): boolean {
  return readJson<boolean>(BARE_MINIMUM_KEY, false);
}

export function saveBareMinimum(value: boolean): void {
  writeJson(BARE_MINIMUM_KEY, value);
}
