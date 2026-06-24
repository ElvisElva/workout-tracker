import { useEffect, useMemo, useState } from "react";
import {
  ActiveWorkoutState,
  Exercise,
  ExerciseLog,
  ExerciseValue,
  PlannedExercise,
  ProgressionSuggestion,
  Section,
  WorkoutDay,
  WorkoutHistory,
} from "./types";
import {
  adjustmentLabel,
  adjustValue,
  flattenWorkout,
  formatClock,
  formatDate,
  formatDateTime,
  getProgressKey,
  getWeekNumber,
  initialValueForExercise,
  resultText,
  targetText,
  uid,
  updateProgressionsFromHistory,
  valueKey,
} from "./progression";
import {
  loadActiveWorkout,
  loadBareMinimum,
  loadHistory,
  loadProgressions,
  loadWorkouts,
  resetWorkouts,
  saveActiveWorkout,
  saveBareMinimum,
  saveHistory,
  saveProgressions,
  saveWorkouts,
} from "./storage";
import { MUST_TRACK_BASELINES } from "./workouts";

type View = "home" | "workout" | "history" | "progress" | "edit";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (event: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function totalElapsedSeconds(state: ActiveWorkoutState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  const end = state.isRunning ? now : state.pauseStartedAt ?? now;
  return Math.max(0, (end - state.startedAt - state.totalPausedMs) / 1000);
}

function phaseElapsedSeconds(state: ActiveWorkoutState, now = Date.now()): number {
  if (!state.phaseStartedAt) return 0;
  const end = state.isRunning ? now : state.phasePauseStartedAt ?? now;
  return Math.max(0, (end - state.phaseStartedAt - state.phasePausedMs) / 1000);
}

function getSupersetRange(plan: PlannedExercise[], index: number): { start: number; end: number } | null {
  const group = plan[index]?.exercise.supersetGroup;
  if (!group) return null;

  let start = index;
  while (start > 0 && plan[start - 1].exercise.supersetGroup === group) {
    start -= 1;
  }

  let end = index;
  while (end + 1 < plan.length && plan[end + 1].exercise.supersetGroup === group) {
    end += 1;
  }

  return { start, end };
}

function isLastSupersetExerciseForSet(state: ActiveWorkoutState): boolean {
  const range = getSupersetRange(state.plan, state.currentIndex);
  if (!range) return true;

  for (let index = state.currentIndex + 1; index <= range.end; index += 1) {
    if (state.plan[index].exercise.sets >= state.currentSet) {
      return false;
    }
  }

  return true;
}

function isRestAllowed(state: ActiveWorkoutState, item: PlannedExercise): boolean {
  const section = item.sectionName.toLowerCase();
  return (
    !section.includes("warm-up") &&
    !section.includes("mobility") &&
    (item.exercise.restSeconds ?? 0) > 0 &&
    isLastSupersetExerciseForSet(state)
  );
}

function createInitialValues(
  plan: PlannedExercise[],
  bareMinimum: boolean,
  progressions: Record<string, ProgressionSuggestion>,
): Record<string, ExerciseValue> {
  return plan.reduce<Record<string, ExerciseValue>>((values, item) => {
    const suggested = progressions[getProgressKey(item.exercise)]?.nextValues ?? [];
    for (let set = 1; set <= item.exercise.sets; set += 1) {
      values[valueKey(item.exercise.id, set)] =
        suggested[set - 1] ??
        initialValueForExercise(item.exercise, bareMinimum, progressions, set);
    }
    return values;
  }, {});
}

function getCurrentValue(state: ActiveWorkoutState, progressions: Record<string, ProgressionSuggestion>) {
  const item = state.plan[state.currentIndex];
  const key = valueKey(item.exercise.id, state.currentSet);
  return (
    state.values[key] ??
    initialValueForExercise(item.exercise, state.bareMinimum, progressions, state.currentSet)
  );
}

function getStepTarget(
  state: ActiveWorkoutState,
  item: PlannedExercise,
  setNumber: number,
  progressions: Record<string, ProgressionSuggestion>,
): ExerciseValue {
  return (
    state.values[valueKey(item.exercise.id, setNumber)] ??
    initialValueForExercise(item.exercise, state.bareMinimum, progressions, setNumber)
  );
}

function getNextStep(state: ActiveWorkoutState): { index: number; set: number } | null {
  const item = state.plan[state.currentIndex];
  if (!item) return null;

  const supersetRange = getSupersetRange(state.plan, state.currentIndex);
  if (supersetRange) {
    for (let index = state.currentIndex + 1; index <= supersetRange.end; index += 1) {
      if (state.plan[index].exercise.sets >= state.currentSet) {
        return { index, set: state.currentSet };
      }
    }

    for (let index = supersetRange.start; index <= supersetRange.end; index += 1) {
      if (state.plan[index].exercise.sets >= state.currentSet + 1) {
        return { index, set: state.currentSet + 1 };
      }
    }

    if (supersetRange.end + 1 < state.plan.length) {
      return { index: supersetRange.end + 1, set: 1 };
    }

    return null;
  }

  if (state.currentSet < item.exercise.sets) {
    return { index: state.currentIndex, set: state.currentSet + 1 };
  }
  if (state.currentIndex + 1 < state.plan.length) {
    return { index: state.currentIndex + 1, set: 1 };
  }
  return null;
}

function startPhase(state: ActiveWorkoutState, now: number): ActiveWorkoutState {
  return {
    ...state,
    restAdjustmentSeconds: 0,
    phaseStartedAt: now,
    phasePausedMs: 0,
    phasePauseStartedAt: state.isRunning ? null : now,
  };
}

function ensureStarted(state: ActiveWorkoutState, now: number): ActiveWorkoutState {
  if (state.startedAt) return state;

  return {
    ...state,
    startedAt: now,
    isRunning: true,
    pauseStartedAt: null,
    phaseStartedAt: now,
    phasePausedMs: 0,
    phasePauseStartedAt: null,
  };
}

function moveToNextStep(
  state: ActiveWorkoutState,
  now: number,
): { state: ActiveWorkoutState | null; finished: boolean } {
  const nextStep = getNextStep(state);

  if (!nextStep) {
    return { state: null, finished: true };
  }

  return {
    finished: false,
    state: startPhase(
      {
        ...state,
        currentIndex: nextStep.index,
        currentSet: nextStep.set,
        phase: "exercise",
      },
      now,
    ),
  };
}

function restOrMove(
  state: ActiveWorkoutState,
  completedItem: PlannedExercise,
  now: number,
): { state: ActiveWorkoutState | null; finished: boolean } {
  const hasNext = getNextStep(state);
  if (hasNext && isRestAllowed(state, completedItem)) {
    return {
      finished: false,
      state: startPhase(
        {
          ...state,
          phase: "rest",
        },
        now,
      ),
    };
  }

  return moveToNextStep(state, now);
}

function buildHistoryEntry(state: ActiveWorkoutState, completedAt: number): WorkoutHistory {
  return {
    id: uid("history"),
    workoutId: state.workoutId,
    workoutName: state.workoutName,
    bareMinimum: state.bareMinimum,
    startedAt: state.startedAt ?? state.createdAt,
    completedAt,
    durationSeconds: totalElapsedSeconds(state, completedAt),
    logs: state.logs,
  };
}

function useWakeLock(shouldHold: boolean): boolean {
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    let released = false;
    let sentinel: WakeLockSentinelLike | null = null;

    async function requestLock() {
      const nav = navigator as WakeLockNavigator;
      if (!shouldHold) {
        setAwake(false);
        return;
      }

      if (!nav.wakeLock || document.visibilityState !== "visible") {
        setAwake(false);
        return;
      }

      try {
        await sentinel?.release();
        sentinel = await nav.wakeLock.request("screen");
        if (released) {
          await sentinel.release();
          return;
        }
        setAwake(true);
        sentinel.addEventListener("release", () => {
          if (!released) setAwake(false);
        });
      } catch {
        setAwake(false);
      }
    }

    function handleReturnToWorkout() {
      if (document.visibilityState === "visible") {
        void requestLock();
      }
    }

    void requestLock();
    document.addEventListener("visibilitychange", handleReturnToWorkout);
    window.addEventListener("pageshow", handleReturnToWorkout);
    window.addEventListener("focus", handleReturnToWorkout);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleReturnToWorkout);
      window.removeEventListener("pageshow", handleReturnToWorkout);
      window.removeEventListener("focus", handleReturnToWorkout);
      void sentinel?.release();
    };
  }, [shouldHold]);

  return awake;
}

function collectProgressRows(
  history: WorkoutHistory[],
  workouts: WorkoutDay[],
  progressions: Record<string, ProgressionSuggestion>,
  filter: string,
) {
  const exerciseNames = new Map<string, Exercise>();
  workouts.forEach((workout) => {
    workout.sections.forEach((section) => {
      section.exercises.forEach((exercise) => {
        if (exercise.isMustTrack) {
          exerciseNames.set(getProgressKey(exercise), exercise);
        }
      });
    });
  });

  return history
    .slice(0, 30)
    .flatMap((entry) => {
      const grouped = new Map<string, ExerciseLog[]>();
      entry.logs.forEach((log) => {
        if (!log.isMustTrack || log.status !== "done") return;
        const key = log.progressKey ?? log.exerciseId;
        grouped.set(key, [...(grouped.get(key) ?? []), log]);
      });

      return Array.from(grouped.entries()).map(([progressKey, logs]) => {
        const first = logs[0];
        const exercise =
          exerciseNames.get(progressKey) ??
          ({
            id: first.exerciseId,
            progressKey,
            name: first.exerciseName,
            type: first.type,
            sets: logs.length,
          } satisfies Exercise);
        const values = logs
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((log) => log.actualValue);
        const nextTarget = progressions[progressKey]?.nextValues ?? [];

        return {
          date: formatDate(entry.completedAt),
          exercise,
          progressKey,
          result: resultText(exercise, values),
          nextTarget: nextTarget.length > 0 ? resultText(exercise, nextTarget) : "",
          notes: MUST_TRACK_BASELINES[progressKey] ?? "",
        };
      });
    })
    .filter((row) => !filter || row.progressKey === filter);
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [workouts, setWorkouts] = useState<WorkoutDay[]>(() => loadWorkouts());
  const [active, setActive] = useState<ActiveWorkoutState | null>(() => loadActiveWorkout());
  const [history, setHistory] = useState<WorkoutHistory[]>(() => loadHistory());
  const [progressions, setProgressions] = useState<Record<string, ProgressionSuggestion>>(() =>
    loadProgressions(),
  );
  const [bareMinimum, setBareMinimum] = useState<boolean>(() => loadBareMinimum());
  const [view, setView] = useState<View>(() => (loadActiveWorkout() ? "workout" : "home"));
  const [tick, setTick] = useState(Date.now());
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [stopPrompt, setStopPrompt] = useState(false);
  const [progressFilter, setProgressFilter] = useState("");
  const [editWorkoutId, setEditWorkoutId] = useState("");

  const screenAwake = useWakeLock(Boolean(active?.isRunning));

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    const onVisibility = () => setTick(Date.now());

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => saveWorkouts(workouts), [workouts]);
  useEffect(() => saveActiveWorkout(active), [active]);
  useEffect(() => saveHistory(history), [history]);
  useEffect(() => saveProgressions(progressions), [progressions]);
  useEffect(() => saveBareMinimum(bareMinimum), [bareMinimum]);

  const today = new Date(tick);
  const todaysWorkout =
    workouts.find((workout) => workout.day === DAY_ORDER[today.getDay()]) ?? workouts[0];
  const selectedWorkout =
    workouts.find((workout) => workout.id === (selectedWorkoutId || todaysWorkout?.id)) ??
    todaysWorkout;

  useEffect(() => {
    if (!selectedWorkoutId && todaysWorkout) {
      setSelectedWorkoutId(todaysWorkout.id);
    }
  }, [selectedWorkoutId, todaysWorkout]);

  const currentWorkout = active?.plan[active.currentIndex] ?? null;
  const currentValue = active && currentWorkout ? getCurrentValue(active, progressions) : null;
  const totalTime = active ? totalElapsedSeconds(active, tick) : 0;
  const phaseTime = active ? phaseElapsedSeconds(active, tick) : 0;
  const restBase = currentWorkout?.exercise.restSeconds ?? 0;
  const restTotal = Math.max(0, restBase + (active?.restAdjustmentSeconds ?? 0));
  const restRemaining = Math.max(0, restTotal - phaseTime);
  const timedRemaining =
    active && currentWorkout && currentValue
      ? Math.max(0, (currentValue.seconds ?? 0) - phaseTime)
      : 0;

  useEffect(() => {
    if (!active || active.phase !== "rest" || !active.isRunning) return;
    if (restRemaining <= 0) {
      completeRest();
    }
  }, [active, restRemaining]);

  const nextInfo = useMemo(() => {
    if (!active) return null;
    const nextStep = getNextStep(active);
    if (!nextStep) return null;
    const item = active.plan[nextStep.index];
    const value = getStepTarget(active, item, nextStep.set, progressions);
    return {
      item,
      set: nextStep.set,
      value,
    };
  }, [active, progressions]);

  const progressRows = useMemo(
    () => collectProgressRows(history, workouts, progressions, progressFilter),
    [history, workouts, progressions, progressFilter],
  );

  const progressOptions = useMemo(() => {
    const options = new Map<string, string>();
    workouts.forEach((workout) => {
      workout.sections.forEach((section) => {
        section.exercises.forEach((exercise) => {
          if (exercise.isMustTrack) {
            options.set(getProgressKey(exercise), exercise.name);
          }
        });
      });
    });
    return Array.from(options.entries());
  }, [workouts]);

  function toggleBareMinimum() {
    setBareMinimum((value) => !value);
  }

  function startWorkout(workout: WorkoutDay) {
    if (active) {
      const replace = window.confirm("Replace the saved workout in progress?");
      if (!replace) {
        setView("workout");
        return;
      }
    }

    const plan = flattenWorkout(workout, bareMinimum);
    if (plan.length === 0) {
      window.alert("No exercises found for this mode.");
      return;
    }

    const now = Date.now();
    setActive({
      sessionId: uid("session"),
      workoutId: workout.id,
      workoutName: `${workout.day} ${workout.name}`,
      bareMinimum,
      plan,
      createdAt: now,
      startedAt: now,
      totalPausedMs: 0,
      pauseStartedAt: null,
      isRunning: true,
      currentIndex: 0,
      currentSet: 1,
      phase: "exercise",
      phaseStartedAt: now,
      phasePausedMs: 0,
      phasePauseStartedAt: null,
      restAdjustmentSeconds: 0,
      values: createInitialValues(plan, bareMinimum, progressions),
      logs: [],
    });
    setStopPrompt(false);
    setView("workout");
  }

  function togglePause() {
    if (!active) return;
    const now = Date.now();

    if (active.isRunning) {
      setActive({
        ...active,
        isRunning: false,
        pauseStartedAt: now,
        phasePauseStartedAt: now,
      });
      return;
    }

    setActive({
      ...active,
      isRunning: true,
      totalPausedMs:
        active.totalPausedMs + (active.pauseStartedAt ? now - active.pauseStartedAt : 0),
      pauseStartedAt: null,
      phasePausedMs:
        active.phasePausedMs +
        (active.phasePauseStartedAt ? now - active.phasePauseStartedAt : 0),
      phasePauseStartedAt: null,
    });
  }

  function changeCurrentValue(direction: 1 | -1) {
    if (!active || !currentWorkout || active.phase === "rest") return;

    const key = valueKey(currentWorkout.exercise.id, active.currentSet);
    const value = getCurrentValue(active, progressions);

    setActive({
      ...active,
      values: {
        ...active.values,
        [key]: adjustValue(currentWorkout.exercise, value, direction),
      },
    });
  }

  function adjustRest(seconds: number) {
    if (!active || active.phase !== "rest") return;
    setActive({
      ...active,
      restAdjustmentSeconds: (active.restAdjustmentSeconds ?? 0) + seconds,
    });
  }

  function finishFromState(state: ActiveWorkoutState, completedAt: number) {
    const entry = buildHistoryEntry(state, completedAt);
    setHistory((items) => [entry, ...items]);
    setProgressions((items) => updateProgressionsFromHistory(items, entry));
    setActive(null);
    setStopPrompt(false);
    setView("home");
  }

  function applyMoveResult(
    result: { state: ActiveWorkoutState | null; finished: boolean },
    sourceState: ActiveWorkoutState,
    now: number,
  ) {
    if (result.finished) {
      finishFromState(sourceState, now);
    } else {
      setActive(result.state);
    }
  }

  function completeRest() {
    if (!active) return;
    const now = Date.now();
    const nextState = ensureStarted(active, now);
    const result = moveToNextStep(nextState, now);
    applyMoveResult(result, nextState, now);
  }

  function completeCurrent(status: "done" | "skipped") {
    if (!active || !currentWorkout || !currentValue) return;

    if (active.phase === "rest") {
      completeRest();
      return;
    }

    const now = Date.now();
    const startedState = ensureStarted(active, now);
    const exercise = currentWorkout.exercise;
    const log: ExerciseLog = {
      id: uid("log"),
      exerciseId: exercise.id,
      progressKey: getProgressKey(exercise),
      exerciseName: exercise.name,
      sectionName: currentWorkout.sectionName,
      setNumber: startedState.currentSet,
      type: exercise.type,
      targetValue: currentValue,
      actualValue: currentValue,
      isMustTrack: Boolean(exercise.isMustTrack),
      status,
      completedAt: now,
      notes: exercise.notes,
    };

    const loggedState: ActiveWorkoutState = {
      ...startedState,
      logs: [...startedState.logs, log],
    };

    const result = restOrMove(loggedState, currentWorkout, now);
    applyMoveResult(result, loggedState, now);
  }

  function saveAndStop() {
    if (!active) return;
    finishFromState(active, Date.now());
  }

  function discardAndStop() {
    setActive(null);
    setStopPrompt(false);
    setView("home");
  }

  function updateExercise(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    patch: Partial<Exercise>,
  ) {
    setWorkouts((items) =>
      items.map((workout) => {
        if (workout.id !== workoutId) return workout;
        const sections = workout.sections.map((section, sIndex) => {
          if (sIndex !== sectionIndex) return section;
          return {
            ...section,
            exercises: section.exercises.map((exercise, eIndex) =>
              eIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
            ),
          };
        });
        return { ...workout, sections };
      }),
    );
  }

  function addExercise(workoutId: string, sectionIndex: number) {
    setWorkouts((items) =>
      items.map((workout) => {
        if (workout.id !== workoutId) return workout;
        const sections = workout.sections.map((section, sIndex) => {
          if (sIndex !== sectionIndex) return section;
          const id = uid("exercise");
          const newExercise: Exercise = {
            id,
            name: "New exercise",
            type: "reps",
            sets: 1,
            repsMin: 8,
            repsMax: 8,
            restSeconds: section.name === "Warm-up" || section.name === "Mobility" ? 0 : 60,
          };
          return {
            ...section,
            exercises: [...section.exercises, newExercise],
          };
        });
        return { ...workout, sections };
      }),
    );
  }

  function deleteExercise(workoutId: string, sectionIndex: number, exerciseIndex: number) {
    setWorkouts((items) =>
      items.map((workout) => {
        if (workout.id !== workoutId) return workout;
        const sections = workout.sections.map((section, sIndex) => {
          if (sIndex !== sectionIndex) return section;
          return {
            ...section,
            exercises: section.exercises.filter((_, eIndex) => eIndex !== exerciseIndex),
          };
        });
        return { ...workout, sections };
      }),
    );
  }

  function moveExercise(
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    direction: -1 | 1,
  ) {
    setWorkouts((items) =>
      items.map((workout) => {
        if (workout.id !== workoutId) return workout;
        const sections = workout.sections.map((section, sIndex) => {
          if (sIndex !== sectionIndex) return section;
          const nextIndex = exerciseIndex + direction;
          if (nextIndex < 0 || nextIndex >= section.exercises.length) return section;
          const exercises = [...section.exercises];
          const [moved] = exercises.splice(exerciseIndex, 1);
          exercises.splice(nextIndex, 0, moved);
          return { ...section, exercises };
        });
        return { ...workout, sections };
      }),
    );
  }

  function exportCsv() {
    const header = ["Date", "Exercise", "Result", "Next Target", "Notes"];
    const rows = progressRows.map((row) => [
      row.date,
      row.exercise.name,
      row.result,
      row.nextTarget,
      row.notes,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadText("workout-progress.csv", csv, "text/csv");
  }

  function exportJson() {
    downloadText("workout-progress.json", JSON.stringify(progressRows, null, 2), "application/json");
  }

  if (view === "workout" && active && currentWorkout && currentValue) {
    const exercise = currentWorkout.exercise;
    const target = targetText(exercise, currentValue);
    const isTimed = exercise.type === "time" || exercise.type === "sprint";

    return (
      <main className="workout-screen">
        <section className="workout-top">
          <span>Total Time</span>
          <strong>{formatClock(totalTime)}</strong>
          {screenAwake ? <small>Screen awake</small> : null}
        </section>

        <section className="workout-body">
          <p className="workout-name">{active.workoutName}</p>

          {active.phase === "rest" ? (
            <div className="rest-view">
              <span>Rest</span>
              <strong>{formatClock(restRemaining)}</strong>
              <p>{nextInfo ? nextInfo.item.exercise.name : "Finish"}</p>
            </div>
          ) : (
            <div className="current-view">
              <span>{currentWorkout.sectionName}</span>
              <h1>{exercise.name}</h1>
              <p>Set {active.currentSet} of {exercise.sets}</p>
              <strong>{isTimed ? formatClock(timedRemaining) : target}</strong>
            </div>
          )}

          {nextInfo ? (
            <div className="next-line">
              <span>Next</span>
              <strong>{nextInfo.item.exercise.name}</strong>
              <small>{targetText(nextInfo.item.exercise, nextInfo.value)}</small>
            </div>
          ) : (
            <div className="next-line">
              <span>Next</span>
              <strong>Finish</strong>
              <small>Save workout</small>
            </div>
          )}
        </section>

        <section className="workout-controls">
          {active.phase === "rest" ? (
            <div className="rest-actions">
              <button onClick={() => adjustRest(-10)}>-10 sec</button>
              <button onClick={() => adjustRest(10)}>+10 sec</button>
              <button onClick={completeRest}>Skip rest</button>
            </div>
          ) : (
            <div className="value-stepper">
              <button onClick={() => changeCurrentValue(-1)}>{adjustmentLabel(exercise, -1)}</button>
              <div>{target}</div>
              <button onClick={() => changeCurrentValue(1)}>{adjustmentLabel(exercise, 1)}</button>
            </div>
          )}

          <div className="workout-actions">
            <button onClick={togglePause}>{active.isRunning ? "Pause" : "Resume"}</button>
            <button className="done-button" onClick={() => completeCurrent("done")}>
              {active.phase === "rest" ? "Next" : "Done"}
            </button>
            <button onClick={() => completeCurrent("skipped")} disabled={active.phase === "rest"}>
              Skip
            </button>
          </div>
          <button className="stop-button" onClick={() => setStopPrompt(true)}>
            Stop Workout
          </button>
        </section>

        {stopPrompt ? (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="stop-modal">
              <h2>Stop workout?</h2>
              <button className="done-button" onClick={saveAndStop}>
                Save and stop
              </button>
              <button className="danger" onClick={discardAndStop}>
                Discard and stop
              </button>
              <button onClick={() => setStopPrompt(false)}>Continue workout</button>
            </section>
          </div>
        ) : null}
      </main>
    );
  }

  if (view === "history") {
    return (
      <main className="app-shell">
        <div className="top-row">
          <button className="quiet-button" onClick={() => setView("home")}>
            Back
          </button>
          <h1 className="page-title">History</h1>
        </div>

        <section className="list-stack">
          {history.length === 0 ? (
            <p className="empty-state">No saved workouts yet.</p>
          ) : (
            history.slice(0, 30).map((entry) => (
              <article className="history-item" key={entry.id}>
                <div className="history-top">
                  <strong>{entry.workoutName}</strong>
                  <span>{formatClock(entry.durationSeconds)}</span>
                </div>
                <p>{formatDateTime(entry.completedAt)}</p>
              </article>
            ))
          )}
        </section>
      </main>
    );
  }

  if (view === "progress") {
    return (
      <main className="app-shell progress-shell">
        <div className="top-row">
          <button className="quiet-button" onClick={() => setView("home")}>
            Back
          </button>
          <h1 className="page-title">Progress</h1>
        </div>

        <div className="progress-tools">
          <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value)}>
            <option value="">All exercises</option>
            {progressOptions.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <button onClick={exportCsv}>CSV</button>
          <button onClick={exportJson}>JSON</button>
        </div>

        <section className="sheet-table" aria-label="Progress table">
          <div className="sheet-header">
            <span>Date</span>
            <span>Exercise</span>
            <span>Result</span>
            <span>Next Target</span>
            <span>Notes</span>
          </div>
          {progressRows.length === 0 ? (
            <p className="empty-state">No progress rows yet.</p>
          ) : (
            progressRows.map((row, index) => (
              <div className="sheet-row" key={`${row.progressKey}-${row.date}-${index}`}>
                <span>{row.date}</span>
                <strong>{row.exercise.name}</strong>
                <span>{row.result}</span>
                <span>{row.nextTarget}</span>
                <span>{row.notes}</span>
              </div>
            ))
          )}
        </section>
      </main>
    );
  }

  if (view === "edit") {
    const editedWorkout = workouts.find((workout) => workout.id === editWorkoutId);

    return (
      <main className="app-shell editor-shell">
        <div className="top-row">
          <button className="quiet-button" onClick={() => setView("home")}>
            Back
          </button>
          <h1 className="page-title">Edit Workouts</h1>
        </div>

        {!editedWorkout ? (
          <section className="edit-choice-list">
            {workouts.map((workout) => (
              <button key={workout.id} onClick={() => setEditWorkoutId(workout.id)}>
                <span>{workout.day}</span>
                <strong>{workout.name}</strong>
              </button>
            ))}
            <button
              onClick={() => {
                const defaults = resetWorkouts();
                setWorkouts(defaults);
              }}
            >
              Reset all workouts
            </button>
          </section>
        ) : (
          <WorkoutEditor
            workout={editedWorkout}
            onBack={() => setEditWorkoutId("")}
            onAdd={addExercise}
            onDelete={deleteExercise}
            onMove={moveExercise}
            onUpdate={updateExercise}
          />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell home-shell">
      <section className="home-header simple-home-header">
        <div className="date-row">
          <span>{DATE_FORMAT.format(today)}</span>
          <span>Week {getWeekNumber(today)}</span>
        </div>
        <h1>Workout Tracker</h1>
      </section>

      {active ? (
        <button className="resume-button" onClick={() => setView("workout")}>
          Resume workout
          <span>{formatClock(totalElapsedSeconds(active, tick))}</span>
        </button>
      ) : null}

      <section className="today-card">
        <span>Today</span>
        <h2>
          {selectedWorkout.day} - {selectedWorkout.name}
        </h2>
        <button className="start-workout-button" onClick={() => startWorkout(selectedWorkout)}>
          Start Workout
        </button>
        <button className="change-workout-button" onClick={() => setShowWorkoutPicker((value) => !value)}>
          Change workout
        </button>

        {showWorkoutPicker ? (
          <div className="workout-picker">
            {workouts.map((workout, index) => (
              <button
                key={workout.id}
                onClick={() => {
                  setSelectedWorkoutId(workout.id);
                  setShowWorkoutPicker(false);
                }}
              >
                {index + 1}. {workout.day} - {workout.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="home-actions">
        <button className={bareMinimum ? "toggle-on" : ""} onClick={toggleBareMinimum}>
          Bare Minimum {bareMinimum ? "ON" : "OFF"}
        </button>
        <button onClick={() => setView("history")}>History</button>
        <button onClick={() => setView("progress")}>Progress</button>
        <button
          onClick={() => {
            setEditWorkoutId("");
            setView("edit");
          }}
        >
          Edit Workouts
        </button>
      </section>
    </main>
  );
}

function WorkoutEditor({
  workout,
  onAdd,
  onBack,
  onDelete,
  onMove,
  onUpdate,
}: {
  workout: WorkoutDay;
  onAdd: (workoutId: string, sectionIndex: number) => void;
  onBack: () => void;
  onDelete: (workoutId: string, sectionIndex: number, exerciseIndex: number) => void;
  onMove: (
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => void;
  onUpdate: (
    workoutId: string,
    sectionIndex: number,
    exerciseIndex: number,
    patch: Partial<Exercise>,
  ) => void;
}) {
  return (
    <section className="workout-editor">
      <button className="quiet-button" onClick={onBack}>
        Choose workout
      </button>
      <h2>
        {workout.day} - {workout.name}
      </h2>
      {workout.sections.map((section: Section, sectionIndex) => (
        <div className="editor-section" key={section.name}>
          <div className="editor-section-top">
            <h3>{section.name}</h3>
            <button onClick={() => onAdd(workout.id, sectionIndex)}>Add exercise</button>
          </div>

          {section.exercises.map((exercise, exerciseIndex) => (
            <article className="exercise-editor" key={exercise.id}>
              <label>
                Name
                <input
                  value={exercise.name}
                  onChange={(event) =>
                    onUpdate(workout.id, sectionIndex, exerciseIndex, {
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <div className="editor-grid">
                <label>
                  Sets
                  <input
                    type="number"
                    min="1"
                    value={exercise.sets}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        sets: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Reps
                  <input
                    type="number"
                    min="0"
                    value={exercise.repsMax ?? exercise.repsMin ?? 0}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        repsMin: Number(event.target.value),
                        repsMax: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Time
                  <input
                    type="number"
                    min="0"
                    value={exercise.secondsMax ?? exercise.secondsMin ?? 0}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        secondsMin: Number(event.target.value),
                        secondsMax: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Weight
                  <input
                    type="number"
                    min="0"
                    value={exercise.weightKg ?? 0}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        weightKg: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Distance
                  <input
                    type="number"
                    min="0"
                    value={exercise.distance ?? 0}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        distance: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Rest
                  <input
                    type="number"
                    min="0"
                    value={exercise.restSeconds ?? 0}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        restSeconds: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <div className="check-row">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(exercise.isBareMinimum)}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        isBareMinimum: event.target.checked,
                      })
                    }
                  />
                  BRMIN
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(exercise.isOptional)}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        isOptional: event.target.checked,
                      })
                    }
                  />
                  Optional
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(exercise.isMustTrack)}
                    onChange={(event) =>
                      onUpdate(workout.id, sectionIndex, exerciseIndex, {
                        isMustTrack: event.target.checked,
                        progressKey: event.target.checked
                          ? exercise.progressKey ?? getProgressKey(exercise)
                          : exercise.progressKey,
                      })
                    }
                  />
                  Must-track
                </label>
              </div>

              <div className="editor-actions-row">
                <button onClick={() => onMove(workout.id, sectionIndex, exerciseIndex, -1)}>
                  Up
                </button>
                <button onClick={() => onMove(workout.id, sectionIndex, exerciseIndex, 1)}>
                  Down
                </button>
                <button className="danger" onClick={() => onDelete(workout.id, sectionIndex, exerciseIndex)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
