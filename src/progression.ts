import {
  Exercise,
  ExerciseLog,
  ExerciseValue,
  PlannedExercise,
  ProgressionSuggestion,
  WorkoutDay,
  WorkoutHistory,
} from "./types";

const PROGRESS_KEY_BY_ID: Record<string, string> = {
  "pull-ups": "pull_ups",
  dips: "dips",
  "handstand-push-ups": "handstand_pushups",
  "farmer-carry": "farmer_carry",
  "back-extensions": "back_extensions",
  "dead-hang": "dead_hang",
  "weighted-squat": "weighted_squat",
  "bulgarian-split-squat": "bulgarian_split_squat",
  "nordic-hamstring-curl": "nordic_hamstring_curl",
  "single-leg-romanian-deadlift": "single_leg_romanian_deadlift",
  "hip-thrust": "hip_thrust",
  "tibialis-raise": "tibialis_raise",
  "single-leg-calf-raise": "single_leg_calf_raise",
  "sprint-time": "sprint_time",
  "broad-jump-distance": "broad_jump_distance",
};

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function flattenWorkout(workout: WorkoutDay, bareMinimum: boolean): PlannedExercise[] {
  return workout.sections.flatMap((section) =>
    section.exercises
      .filter((exercise) => !bareMinimum || exercise.isBareMinimum)
      .map((exercise) => ({
        sectionName: section.name,
        exercise,
      })),
  );
}

export function getProgressKey(exercise: Pick<Exercise, "id" | "name" | "progressKey">): string {
  if (exercise.progressKey) return exercise.progressKey;
  if (PROGRESS_KEY_BY_ID[exercise.id]) return PROGRESS_KEY_BY_ID[exercise.id];
  return exercise.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function getWeekNumber(date: Date): number {
  const working = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  return Math.ceil(((working.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function valueKey(exerciseId: string, setNumber: number): string {
  return `${exerciseId}::${setNumber}`;
}

export function initialValueForExercise(
  exercise: Exercise,
  bareMinimum: boolean,
  progressions: Record<string, ProgressionSuggestion>,
  setNumber = 1,
): ExerciseValue {
  const suggested = progressions[getProgressKey(exercise)]?.nextValues?.[setNumber - 1] ?? {};
  const lowerReps = exercise.repsMin ?? exercise.repsMax;
  const upperReps = exercise.repsMax ?? exercise.repsMin;
  const lowerSeconds = exercise.secondsMin ?? exercise.secondsMax;
  const upperSeconds = exercise.secondsMax ?? exercise.secondsMin;

  return {
    reps: suggested.reps ?? (bareMinimum ? lowerReps : upperReps),
    seconds: suggested.seconds ?? (bareMinimum ? lowerSeconds : upperSeconds),
    weightKg: suggested.weightKg ?? exercise.weightKg,
    distance: suggested.distance ?? exercise.distance,
    distanceUnit: suggested.distanceUnit ?? exercise.distanceUnit,
    note: suggested.note ?? exercise.notes,
  };
}

export function targetText(exercise: Pick<Exercise, "type" | "notes">, value: ExerciseValue): string {
  switch (exercise.type) {
    case "reps":
      return `${value.reps ?? 0} reps`;
    case "time":
      return `${value.seconds ?? 0} sec`;
    case "weight_reps": {
      const load =
        value.weightKg && value.weightKg > 0 ? `${value.weightKg} kg` : "bodyweight";
      return `${load} x ${value.reps ?? 0}`;
    }
    case "distance":
    case "jump":
      return `${value.distance ?? 0} ${value.distanceUnit ?? "m"}`;
    case "carry": {
      const load =
        value.weightKg && value.weightKg > 0 ? `${value.weightKg} kg` : "bodyweight";
      return `${load} x ${value.distance ?? 0} ${value.distanceUnit ?? "m"}`;
    }
    case "sprint":
      return `${value.seconds ?? 0} sec`;
    case "note":
      return value.note ?? exercise.notes ?? "Note";
    default:
      return "Target";
  }
}

export function resultText(exercise: Pick<Exercise, "type" | "notes">, values: ExerciseValue[]): string {
  const filled = values.filter(Boolean);
  if (filled.length === 0) return "";

  if (filled.every((value) => typeof value.reps === "number")) {
    const reps = filled.map((value) => value.reps).join(", ");
    const weight = filled.find((value) => typeof value.weightKg === "number")?.weightKg;
    return typeof weight === "number" && weight > 0 ? `${weight} kg x ${reps}` : reps;
  }

  if (filled.every((value) => typeof value.seconds === "number")) {
    return filled.map((value) => `${value.seconds} sec`).join(", ");
  }

  if (filled.every((value) => typeof value.distance === "number")) {
    const first = filled[0];
    const distances = filled.map((value) => value.distance).join(", ");
    const unit = first.distanceUnit ?? "m";
    const weight = first.weightKg;
    return typeof weight === "number" && weight > 0
      ? `${weight} kg x ${distances} ${unit}`
      : `${distances} ${unit}`;
  }

  return targetText(exercise, filled[filled.length - 1]);
}

export function adjustValue(exercise: Exercise, value: ExerciseValue, direction: 1 | -1): ExerciseValue {
  const next = { ...value };

  switch (exercise.type) {
    case "reps":
      next.reps = Math.max(1, (next.reps ?? 1) + direction);
      break;
    case "time":
    case "sprint":
      next.seconds = Math.max(5, (next.seconds ?? 5) + direction * 5);
      break;
    case "weight_reps":
      next.weightKg = Math.max(0, (next.weightKg ?? 0) + direction);
      break;
    case "distance":
    case "carry":
    case "jump":
      next.distance = Math.max(1, (next.distance ?? 1) + direction);
      break;
    case "note":
      break;
  }

  return next;
}

export function adjustmentLabel(exercise: Exercise, direction: 1 | -1): string {
  const sign = direction === 1 ? "+" : "-";

  switch (exercise.type) {
    case "reps":
      return `${sign}1`;
    case "time":
    case "sprint":
      return `${sign}5s`;
    case "weight_reps":
      return `${sign}1 kg`;
    case "distance":
    case "carry":
      return `${sign}1 m`;
    case "jump":
      return `${sign}1 cm`;
    default:
      return sign;
  }
}

function addOneRepFromEnd(values: ExerciseValue[]): ExerciseValue[] {
  const next = values.map((value) => ({ ...value }));
  for (let index = next.length - 1; index >= 0; index -= 1) {
    const value = next[index];
    if (value && typeof value.reps === "number") {
      value.reps = Math.max(1, value.reps + 1);
      break;
    }
  }
  return next;
}

function progressValues(exercise: Exercise, values: ExerciseValue[]): ExerciseValue[] {
  const next = values.map((value) => ({ ...value }));

  if (exercise.type === "reps") {
    return addOneRepFromEnd(next);
  }

  if (exercise.type === "weight_reps") {
    const topReps = exercise.repsMax ?? exercise.repsMin ?? 0;
    const allAtTop = topReps > 0 && next.every((value) => (value.reps ?? 0) >= topReps);
    if (allAtTop) {
      return next.map((value) => ({
        ...value,
        weightKg: Math.max(0, (value.weightKg ?? exercise.weightKg ?? 0) + 1),
      }));
    }
    return addOneRepFromEnd(next);
  }

  if (exercise.type === "time") {
    const increment = getProgressKey(exercise) === "dead_hang" ? 4 : 5;
    const lastTimed = next.length - 1;
    if (lastTimed >= 0 && typeof next[lastTimed].seconds === "number") {
      next[lastTimed].seconds = Math.max(5, next[lastTimed].seconds + increment);
    }
    return next;
  }

  if (exercise.type === "carry" || exercise.type === "distance" || exercise.type === "jump") {
    const lastDistance = next.length - 1;
    if (lastDistance >= 0 && typeof next[lastDistance].distance === "number") {
      next[lastDistance].distance = next[lastDistance].distance + 1;
    }
    return next;
  }

  if (exercise.type === "sprint") {
    if (next.length < 8) {
      next.push({ ...next[next.length - 1] });
    } else {
      const lastSprint = next.length - 1;
      if (lastSprint >= 0 && typeof next[lastSprint].seconds === "number") {
        next[lastSprint].seconds = next[lastSprint].seconds + 1;
      }
    }
    return next;
  }

  return next;
}

export function createProgressionFromLogs(
  exercise: Exercise,
  logs: ExerciseLog[],
): ProgressionSuggestion {
  const completed = logs
    .filter((log) => log.status === "done")
    .sort((a, b) => a.setNumber - b.setNumber || a.completedAt - b.completedAt)
    .map((log) => log.actualValue);
  const values = completed.length > 0 ? completed : [initialValueForExercise(exercise, false, {})];
  const nextValues = progressValues(exercise, values);

  return {
    progressKey: getProgressKey(exercise),
    exerciseName: exercise.name,
    updatedAt: Date.now(),
    nextValues,
    message: resultText(exercise, nextValues),
  };
}

export function updateProgressionsFromHistory(
  current: Record<string, ProgressionSuggestion>,
  entry: WorkoutHistory,
): Record<string, ProgressionSuggestion> {
  const next = { ...current };
  const grouped = new Map<string, { exercise: Exercise; logs: ExerciseLog[] }>();

  entry.logs.forEach((log) => {
    if (!log.isMustTrack || log.status !== "done") return;
    const progressKey = log.progressKey ?? PROGRESS_KEY_BY_ID[log.exerciseId] ?? log.exerciseId;
    const item = grouped.get(progressKey) ?? {
      exercise: {
        id: log.exerciseId,
        progressKey,
        name: log.exerciseName,
        type: log.type,
        sets: 1,
      },
      logs: [],
    };
    item.logs.push(log);
    grouped.set(progressKey, item);
  });

  grouped.forEach((item, progressKey) => {
    next[progressKey] = createProgressionFromLogs(item.exercise, item.logs);
  });

  return next;
}
