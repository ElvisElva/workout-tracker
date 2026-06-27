import { Exercise, WorkoutDay } from "./types";

const reps = (
  id: string,
  name: string,
  sets: number,
  target: number,
  options: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  type: "reps",
  sets,
  repsMin: target,
  repsMax: target,
  ...options,
});

const time = (
  id: string,
  name: string,
  sets: number,
  seconds: number,
  options: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  type: "time",
  sets,
  secondsMin: seconds,
  secondsMax: seconds,
  ...options,
});

const weightReps = (
  id: string,
  name: string,
  sets: number,
  target: number,
  weightKg: number,
  options: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  type: "weight_reps",
  sets,
  repsMin: target,
  repsMax: target,
  weightKg,
  ...options,
});

const carry = (
  id: string,
  name: string,
  sets: number,
  seconds: number,
  options: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  type: "time",
  sets,
  secondsMin: seconds,
  secondsMax: seconds,
  ...options,
});

const note = (
  id: string,
  name: string,
  options: Partial<Exercise> = {},
): Exercise => ({
  id,
  name,
  type: "note",
  sets: 1,
  ...options,
});

export const MUST_TRACK_BASELINES: Record<string, string> = {
  pull_ups: "Max about 14 reps; start at 8 on strength days and 5 on power days",
  dips: "Max about 15 reps; start at 8 on strength days and 6 on power days",
  handstand_pushups: "Start controlled: 3 reps per set",
  farmer_carry: "Start 30 seconds per carry, add time or load when clean",
  back_extensions: "Start 12 reps",
  dead_hang: "Max about 80 seconds; start 45 seconds for work sets",
  weighted_squat: "Max squat about 106 kg; start around 70 kg x 6",
  bulgarian_split_squat: "Start bodyweight or light load for 8 clean reps each leg",
  nordic_hamstring_curl: "Start 4 controlled reps",
  single_leg_romanian_deadlift: "Start light: 12 kg x 8 each leg",
  hip_thrust: "Start 12 clean reps, add load slowly",
  tibialis_raise: "Start 20 clean reps",
  single_leg_calf_raise: "Start 15 clean reps each side",
  sprint_time: "Hill sprint target: 4 rounds x 15 sec, build toward 8 rounds of 10-20 sec",
  broad_jump_distance: "Broad jump or box jump target: 3 sets x 3 reps; track best clean distance",
};

export const DEFAULT_WORKOUTS: WorkoutDay[] = [
  {
    id: "monday-upper-strength-muscle-grip",
    day: "Monday",
    name: "Upper Strength + Muscle + Grip",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("monday-jump-rope", "Jump rope", 1, 300, {
            isBareMinimum: true,
            notes: "Easy rhythm, light feet.",
          }),
          time("monday-cars", "Shoulder, arm, wrist, elbow, waist CARs", 1, 120, {
            isBareMinimum: true,
          }),
          reps("monday-scap-push-ups", "Scapular push-ups", 1, 10, {
            isBareMinimum: true,
          }),
          reps("monday-scap-pull-ups", "Scapular pull-ups", 1, 6, {
            isBareMinimum: true,
          }),
          reps("monday-band-pull-aparts", "Band pull-aparts", 1, 10, {
            isBareMinimum: true,
          }),
          reps("monday-face-pulls", "Face pulls", 1, 10),
          reps("monday-band-external-rotations", "Band external rotations", 1, 10, {
            notes: "Each side.",
          }),
          time("monday-optional-skill", "Optional skill practice", 1, 420, {
            isOptional: true,
            notes: "Handstand, pike, or controlled movement only. Keep it 5-10 minutes.",
          }),
        ],
      },
      {
        name: "Main Work",
        exercises: [
          reps("pull-ups", "Pull-ups", 3, 8, {
            progressKey: "pull_ups",
            restSeconds: 90,
            supersetGroup: "monday-pull-dip",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Written range: 3x6-10. Progress if form is clean.",
          }),
          reps("dips", "Dips", 3, 8, {
            progressKey: "dips",
            restSeconds: 90,
            supersetGroup: "monday-pull-dip",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Written range: 3x6-10. Rest 90 sec after each superset round.",
          }),
          reps("handstand-push-ups", "Handstand/Pike push-ups", 3, 3, {
            progressKey: "handstand_pushups",
            restSeconds: 90,
            supersetGroup: "monday-hspu-row",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Written range: 3x3-6.",
          }),
          reps("monday-inverted-rows", "Inverted rows", 3, 10, {
            restSeconds: 90,
            supersetGroup: "monday-hspu-row",
            notes: "Written range: 3x8-12. Rest 90 sec after each superset round.",
          }),
          reps("monday-chin-ups", "Chin-ups", 2, 8, {
            restSeconds: 90,
            supersetGroup: "monday-chin-push",
            notes: "Written range: 2x6-10.",
          }),
          reps("monday-push-ups", "Push-ups", 2, 16, {
            restSeconds: 90,
            supersetGroup: "monday-chin-push",
            notes: "Based on 45 max push-ups. Written range: 2x12-20.",
          }),
          reps("monday-lateral-raises", "Lateral raises", 2, 15, {
            restSeconds: 90,
            supersetGroup: "monday-raise-y",
            notes: "Written range: 2x12-20.",
          }),
          reps("monday-band-prone-y-raises", "Band prone Y-raises", 2, 12, {
            restSeconds: 90,
            supersetGroup: "monday-raise-y",
            notes: "Written range: 2x8-15.",
          }),
          carry("farmer-carry", "Farmer carry / Suitcase carry", 2, 30, {
            progressKey: "farmer_carry",
            restSeconds: 90,
            isMustTrack: true,
            notes: "20-40 sec each side.",
          }),
          time("dead-hang", "Dead hang / Towel hang", 2, 45, {
            progressKey: "dead_hang",
            restSeconds: 90,
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Max is about 80 sec. Written range: 2x30-60 sec.",
          }),
        ],
      },
      {
        name: "Mobility",
        exercises: [
          time("monday-crab-stretch", "Crab stretch", 1, 45, { isBareMinimum: true }),
          time("monday-pec-doorway-stretch", "Pec doorway stretch", 1, 45, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("monday-thoracic-cat-cow", "Thoracic rotations / Cat-cow", 1, 90),
          time("monday-wrist-mobility", "Wrist mobility", 1, 90),
        ],
      },
    ],
  },
  {
    id: "tuesday-lower-strength-tendons",
    day: "Tuesday",
    name: "Lower Strength + Tendons",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("tuesday-leg-cars", "Leg CARs", 1, 120, { isBareMinimum: true }),
          time("tuesday-deep-squat-hold", "Deep squat hold", 1, 45, {
            isBareMinimum: true,
          }),
          reps("tuesday-cossack-squat-warmup", "Cossack squat", 1, 5, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          reps("tuesday-knee-to-wall", "Knee-to-wall ankle mobility", 1, 8, {
            notes: "Each side.",
          }),
          reps("tuesday-easy-bodyweight-squats", "Easy bodyweight squats", 1, 12),
          time("tuesday-optional-pistol-skill", "Optional skill practice: Pistol squat", 1, 420, {
            isOptional: true,
            notes: "Keep it 5-10 minutes.",
          }),
        ],
      },
      {
        name: "Main Work",
        exercises: [
          weightReps("weighted-squat", "100 squats or Weighted squat", 4, 6, 70, {
            progressKey: "weighted_squat",
            restSeconds: 120,
            supersetGroup: "tuesday-squat-tib",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Based on 106 kg max. Written range: 4x5-8. Use 100 squats instead if no load.",
          }),
          reps("tibialis-raise", "Tibialis raise", 2, 20, {
            progressKey: "tibialis_raise",
            restSeconds: 120,
            supersetGroup: "tuesday-squat-tib",
            isMustTrack: true,
            notes: "Written range: 2x15-25. Rest 90-120 sec after the round.",
          }),
          weightReps("bulgarian-split-squat", "Bulgarian split squat", 3, 8, 0, {
            progressKey: "bulgarian_split_squat",
            restSeconds: 90,
            supersetGroup: "tuesday-bulg-calf",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Each leg. Written range: 3x6-10.",
          }),
          reps("single-leg-calf-raise", "Single-leg calf raise", 2, 15, {
            progressKey: "single_leg_calf_raise",
            restSeconds: 90,
            supersetGroup: "tuesday-bulg-calf",
            isMustTrack: true,
            notes: "Each side. Written range: 2x12-20.",
          }),
          weightReps("single-leg-romanian-deadlift", "Single-leg Romanian deadlift", 3, 8, 12, {
            progressKey: "single_leg_romanian_deadlift",
            restSeconds: 90,
            supersetGroup: "tuesday-slrdl-hip",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Each leg. Written range: 3x6-10.",
          }),
          reps("hip-thrust", "Hip thrust", 2, 12, {
            progressKey: "hip_thrust",
            restSeconds: 90,
            supersetGroup: "tuesday-slrdl-hip",
            isMustTrack: true,
            notes: "Written range: 2x10-15.",
          }),
          reps("nordic-hamstring-curl", "Nordic hamstring curl", 2, 4, {
            progressKey: "nordic_hamstring_curl",
            restSeconds: 90,
            supersetGroup: "tuesday-nordic-back",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Written range: 2x3-6.",
          }),
          reps("back-extensions", "Back extensions", 2, 12, {
            progressKey: "back_extensions",
            restSeconds: 90,
            supersetGroup: "tuesday-nordic-back",
            isMustTrack: true,
            notes: "Written range: 2x10-15.",
          }),
          reps("tuesday-reverse-nordic", "Reverse Nordic", 2, 6, {
            restSeconds: 90,
            notes: "Slow reps. Written range: 1-2x5-10.",
          }),
        ],
      },
      {
        name: "Mobility",
        exercises: [
          time("tuesday-couch-stretch", "Couch stretch", 1, 60, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          reps("tuesday-9090-hip-rotations", "90/90 hip rotations", 1, 6, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("tuesday-jefferson-curl", "Jefferson curl", 1, 30, {
            isBareMinimum: true,
            notes: "Light and slow.",
          }),
          time("tuesday-calf-stretch-straight", "Calf stretch straight-knee", 1, 45, {
            notes: "Each side.",
          }),
          time("tuesday-calf-stretch-bent", "Calf stretch bent-knee", 1, 45, {
            notes: "Each side.",
          }),
        ],
      },
    ],
  },
  {
    id: "wednesday-joint-health-prehab",
    day: "Wednesday",
    name: "Joint Health + Mobility + Balance + Prehab + Coordination",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("wednesday-jump-rope", "Jump rope", 1, 300, {
            isBareMinimum: true,
            notes: "Easy.",
          }),
          time("wednesday-full-body-cars", "Full-body CARs", 1, 300, {
            isBareMinimum: true,
            notes: "Neck, shoulders, elbows, wrists, spine, hips, knees, ankles.",
          }),
        ],
      },
      {
        name: "Ankles / Feet",
        exercises: [
          time("wednesday-short-foot-balance", "Barefoot single-leg balance with short-foot", 2, 40, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("wednesday-eyes-closed-balance", "Single-leg balance, eyes closed", 2, 30, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          reps("wednesday-band-ankle-inversion-eversion", "Band ankle inversion/eversion", 2, 15, {
            notes: "Each side.",
          }),
          time("wednesday-toe-yoga", "Toe yoga", 2, 45),
          reps("wednesday-knee-to-wall", "Knee-to-wall ankle mobility", 2, 8, {
            notes: "Each side.",
          }),
        ],
      },
      {
        name: "Knees",
        exercises: [
          reps("wednesday-tibialis-raise", "Tibialis raise", 2, 20, {
            isBareMinimum: true,
            notes: "Written range: 2x15-25.",
          }),
          reps("wednesday-single-leg-calf-raise", "Single-leg calf raise", 2, 15, {
            notes: "Each side. Written range: 2x12-20.",
          }),
          reps("wednesday-cossack-squat", "Cossack squat", 2, 5, {
            notes: "Each side, slow and controlled.",
          }),
        ],
      },
      {
        name: "Hips / Lower Back",
        exercises: [
          reps("wednesday-9090-hip-rotations", "90/90 hip rotations", 2, 6, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("wednesday-glute-bridge-hold", "Glute bridge hold", 2, 40, {
            isBareMinimum: true,
          }),
          time("wednesday-cat-cow", "Cat-cow", 1, 90),
          reps("wednesday-jefferson-curl", "Jefferson curl", 2, 5, {
            notes: "Very light, slow reps.",
          }),
        ],
      },
      {
        name: "Shoulders",
        exercises: [
          reps("wednesday-band-external-rotations", "Band external rotations", 2, 12, {
            isBareMinimum: true,
            notes: "Each side. Written range: 2x10-15.",
          }),
          reps("wednesday-face-pulls-band-pull-aparts", "Face pulls / Band pull-aparts", 2, 18, {
            isBareMinimum: true,
            notes: "Written range: 2x15-20.",
          }),
          reps("wednesday-wall-slides", "Wall slides", 1, 15),
          note("wednesday-ball-wall-work", "Work with the ball on the wall", {
            notes: "Lean on the ball on the wall.",
          }),
          reps("wednesday-scapular-push-ups", "Scapular push-ups", 1, 10),
          reps("wednesday-scapular-pull-ups", "Scapular pull-ups", 1, 6),
        ],
      },
      {
        name: "Elbows / Wrists",
        exercises: [
          reps("wednesday-elbow-tendon-work", "Elbow tendon work", 2, 15, {
            isBareMinimum: true,
            notes: "Each side. Written range: 2x12-20.",
          }),
          reps("wednesday-pronation-supination", "Pronation + supination", 2, 15, {
            notes: "Each side. Written range: 2x12-20.",
          }),
          time("wednesday-wrist-mobility", "Wrist mobility", 1, 90, {
            isBareMinimum: true,
          }),
          reps("wednesday-wrist-curls", "Wrist curls", 2, 18, {
            isBareMinimum: true,
            notes: "Light and slow. Written range: 2x15-20.",
          }),
          time("wednesday-dead-hang-easy", "Dead hang", 1, 30, {
            progressKey: "dead_hang",
            isMustTrack: true,
            notes: "Easy only if elbows and shoulders feel good. Written range: 1x20-40 sec.",
          }),
        ],
      },
    ],
  },
  {
    id: "thursday-lower-power-agility-core",
    day: "Thursday",
    name: "Lower Power + Agility + Core + Carries / Sprints",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("thursday-jumping-jacks", "Jumping jacks", 1, 30),
          time("thursday-trunk-twists", "Trunk twists", 1, 30),
          time("thursday-full-body-cars", "Full-body CARs", 1, 120, {
            isBareMinimum: true,
          }),
          time("thursday-deep-squat-hold", "Deep squat hold", 1, 45, {
            isBareMinimum: true,
          }),
          reps("thursday-cossack-squat", "Cossack squat", 1, 5, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          reps("thursday-light-pogo-jumps", "Light pogo jumps", 2, 10, {
            isBareMinimum: true,
          }),
          time("thursday-easy-acceleration-runs", "Easy acceleration runs", 2, 12, {
            isBareMinimum: true,
            notes: "10-20 m.",
          }),
        ],
      },
      {
        name: "Plyometrics / Explosiveness",
        exercises: [
          {
            id: "broad-jump-distance",
            progressKey: "broad_jump_distance",
            name: "Broad jump or Box jump",
            type: "jump",
            sets: 3,
            repsMin: 3,
            repsMax: 3,
            distance: 180,
            distanceUnit: "cm",
            restSeconds: 90,
            isBareMinimum: true,
            isMustTrack: true,
            notes: "3 sets x 3 reps. Track broad jump distance if you choose broad jump. Rest 90 sec.",
          },
          reps("thursday-lateral-bounds", "Lateral bounds", 3, 5, {
            restSeconds: 90,
            isBareMinimum: true,
            notes: "Each side. Rest 90 sec.",
          }),
        ],
      },
      {
        name: "VO2 Max Option",
        exercises: [
          {
            id: "thursday-flat-sprints",
            progressKey: "sprint_time",
            name: "Flat sprints",
            type: "sprint",
            sets: 4,
            secondsMin: 10,
            secondsMax: 15,
            restSeconds: 90,
            optionGroup: "thursday-vo2",
            optionLabel: "Flat sprints",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Choose only one VO2 option. Start 4 sprints x 15 sec. Written range: 4-8x10-20 sec, rest 60-120 sec. BRMIN is 3 sprints.",
          },
          {
            id: "thursday-hill-sprints",
            progressKey: "sprint_time",
            name: "Hill sprints",
            type: "sprint",
            sets: 4,
            secondsMin: 10,
            secondsMax: 15,
            restSeconds: 90,
            optionGroup: "thursday-vo2",
            optionLabel: "Hill sprints",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Must track sprint time. Start 4 hill sprints x 15 sec. Written range: 4-8x10-20 sec, rest 60-120 sec. BRMIN is 3 sprints.",
          },
          time("thursday-cycling-4x4", "Cycling 4x4", 2, 120, {
            restSeconds: 180,
            optionGroup: "thursday-vo2",
            optionLabel: "Cycling 4x4",
            isBareMinimum: true,
            notes: "Choose only one VO2 option. BRMIN: 2 rounds x 2 min hard / 3 min rest. Safe route, fast pedaling, no heavy grinding.",
          }),
          time("thursday-bag-4x4", "Bag 4x4", 2, 120, {
            restSeconds: 180,
            optionGroup: "thursday-vo2",
            optionLabel: "Bag 4x4",
            isBareMinimum: true,
            notes: "Choose only one VO2 option. BRMIN: 2 rounds x 2 min hard / 3 min rest. Rhythm, breathing, guard up, clean punches, 60-80% power.",
          }),
          time("thursday-shadow-boxing-4x4", "Shadow Boxing 4x4", 2, 120, {
            restSeconds: 180,
            optionGroup: "thursday-vo2",
            optionLabel: "Shadow Boxing 4x4",
            isBareMinimum: true,
            notes: "Choose only one VO2 option. BRMIN: 2 rounds x 2 min hard / 3 min rest. Fast hands, light feet, slips, pivots, clean technique.",
          }),
        ],
      },
      {
        name: "Agility / Deceleration",
        exercises: [
          time("thursday-shuttle-runs-or-jump-rope", "Shuttle runs or Jump rope", 3, 60, {
            restSeconds: 60,
            notes: "Shuttle runs 3 rounds or jump rope 3x1 min. Rest 60 sec.",
          }),
          time("thursday-bear-crawl", "Bear crawl", 2, 25, {
            restSeconds: 60,
            notes: "Written range: 2x20-30 sec. Rest 60 sec.",
          }),
        ],
      },
      {
        name: "Core",
        exercises: [
          reps("thursday-hanging-leg-raises", "Hanging leg raises", 3, 12, {
            restSeconds: 60,
            isBareMinimum: true,
            notes: "Rest 60 sec.",
          }),
          time("thursday-plank-hollow", "Plank / Hollow body hold", 2, 60, {
            restSeconds: 60,
            isBareMinimum: true,
            notes: "Rest 60 sec.",
          }),
          time("thursday-copenhagen-plank", "Copenhagen plank", 2, 30, {
            restSeconds: 60,
            isOptional: true,
            notes: "Each side. Use instead of plank/hollow if wanted. Rest 60 sec.",
          }),
        ],
      },
      {
        name: "Carries",
        exercises: [
          carry("thursday-farmer-carry", "Farmer carry or Suitcase carry", 2, 30, {
            progressKey: "farmer_carry",
            restSeconds: 90,
            isBareMinimum: true,
            isMustTrack: true,
            notes: "20-40 sec, each side for suitcase carry. Rest 90 sec.",
          }),
        ],
      },
      {
        name: "Mobility",
        exercises: [
          time("thursday-couch-stretch", "Couch stretch", 1, 60, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          reps("thursday-9090-hip-rotations", "90/90 hip rotations", 1, 6, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("thursday-calf-stretch-straight", "Calf stretch straight-knee", 1, 45, {
            notes: "Each side.",
          }),
          time("thursday-calf-stretch-bent", "Calf stretch bent-knee", 1, 45, {
            notes: "Each side.",
          }),
        ],
      },
    ],
  },
  {
    id: "friday-upper-power-rotation-bag",
    day: "Friday",
    name: "Upper Power + Rotation + Punching Bag",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("friday-jump-rope", "Jump rope", 1, 300),
          time("friday-cars", "CARs", 1, 120),
          reps("friday-scapular-push-ups", "Scapular push-ups", 1, 8),
          reps("friday-band-pull-aparts-face-pulls", "Band pull-aparts OR face pulls", 1, 18),
          reps("friday-external-rotations", "External rotations", 1, 10, {
            notes: "Each side.",
          }),
        ],
      },
      {
        name: "Main Work",
        exercises: [
          reps("friday-explosive-push-ups", "Explosive push-ups", 4, 4, {
            restSeconds: 90,
            isBareMinimum: true,
            notes: "Fast, clean reps only. Written range: 4x3-5, rest 60-90 sec.",
          }),
          reps("friday-pull-ups", "Pull-ups", 2, 5, {
            progressKey: "pull_ups",
            restSeconds: 90,
            supersetGroup: "friday-pull-hspu",
            isMustTrack: true,
            notes: "Written range: 2x4-6.",
          }),
          reps("friday-handstand-push-ups", "Handstand push-ups / Pike push-ups", 2, 3, {
            progressKey: "handstand_pushups",
            restSeconds: 90,
            supersetGroup: "friday-pull-hspu",
            isMustTrack: true,
            notes: "Rest 90 sec after the superset round.",
          }),
          reps("friday-dips", "Dips", 2, 6, {
            progressKey: "dips",
            restSeconds: 90,
            isMustTrack: true,
            notes: "Written range: 2x5-8, rest 90 sec.",
          }),
          reps("friday-rotational-punch", "Rotational punch", 2, 12, {
            restSeconds: 60,
            notes: "Each side. Written range: 2x10-15 each side, rest 60 sec.",
          }),
          reps("friday-back-extensions", "Back extensions", 2, 12, {
            progressKey: "back_extensions",
            restSeconds: 60,
            supersetGroup: "friday-back-pallof",
            isBareMinimum: true,
            isMustTrack: true,
            notes: "Written range: 2x12-15.",
          }),
          time("friday-pallof-press", "Pallof press", 2, 25, {
            restSeconds: 60,
            supersetGroup: "friday-back-pallof",
            notes: "Each side. Written range: 2x20-30 sec.",
          }),
        ],
      },
      {
        name: "Fighting / Reaction",
        exercises: [
          time("friday-punching-bag", "Punching bag", 3, 120, {
            restSeconds: 60,
            isBareMinimum: true,
            notes: "3 rounds x 2 min, rest 60 sec.",
          }),
          time("friday-tennis-ball-reaction", "Tennis ball reaction", 2, 45, {
            restSeconds: 60,
          }),
          time("friday-wall-accuracy", "Wall accuracy", 2, 45, {
            restSeconds: 60,
          }),
        ],
      },
      {
        name: "Mobility",
        exercises: [
          time("friday-crab-stretch", "Crab stretch", 1, 45, { isBareMinimum: true }),
          time("friday-pec-doorway-stretch", "Pec doorway stretch", 1, 45, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("friday-thoracic-cat-cow", "Thoracic rotations / Cat-cow", 1, 90),
          time("friday-wrist-mobility", "Wrist mobility", 1, 90, {
            isBareMinimum: true,
          }),
        ],
      },
    ],
  },
  {
    id: "saturday-zone-2-neck-mobility",
    day: "Saturday",
    name: "Zone 2 + Light Neck/Mobility",
    sections: [
      {
        name: "Warm-up - No Rest",
        exercises: [
          time("saturday-full-body-cars", "Full-body CARs", 1, 120, {
            isBareMinimum: true,
          }),
          time("saturday-deep-squat-hold", "Deep squat hold", 1, 45, {
            isBareMinimum: true,
          }),
          time("saturday-easy-movement-warmup", "Easy movement warm-up", 1, 240, {
            isBareMinimum: true,
          }),
        ],
      },
      {
        name: "Zone 2",
        exercises: [
          time("saturday-easy-walk-bike-run", "Easy walk / bike / run", 1, 1200, {
            optionGroup: "saturday-zone2",
            optionLabel: "Easy walk / bike / run",
            isBareMinimum: true,
            notes: "Choose only one Zone 2 option. 20 min. No extra rest needed.",
          }),
          time("saturday-zone-2-run", "Zone 2 run", 1, 2400, {
            optionGroup: "saturday-zone2",
            optionLabel: "Zone 2 run",
            isBareMinimum: true,
            notes: "30-45 min option. No extra rest needed.",
          }),
          time("saturday-uphill-walk", "Uphill walk", 1, 2700, {
            optionGroup: "saturday-zone2",
            optionLabel: "Uphill walk",
            isBareMinimum: true,
            notes: "30-60 min option. No extra rest needed.",
          }),
          time("saturday-easy-cycling", "Easy cycling", 1, 3000, {
            optionGroup: "saturday-zone2",
            optionLabel: "Easy cycling",
            isBareMinimum: true,
            notes: "40-60 min option. No extra rest needed.",
          }),
          note("saturday-zone-2-rule", "Intensity rule", {
            isBareMinimum: true,
            notes: "You should be able to talk. Breathing is steady. No ego. Finish feeling better, not destroyed.",
          }),
        ],
      },
      {
        name: "Light Neck",
        exercises: [
          time("saturday-neck-isometrics", "6-way neck isometrics", 1, 90, {
            restSeconds: 30,
            isBareMinimum: true,
            notes: "1 round, 10-20 sec each direction. Rest 30 sec.",
          }),
          time("saturday-chin-tuck-holds", "Chin tuck holds", 2, 25, {
            restSeconds: 30,
            notes: "Rest 30 sec.",
          }),
          reps("saturday-neck-cars", "Neck CARs", 1, 3, {
            restSeconds: 30,
            notes: "3 slow circles each direction. Rest 30 sec.",
          }),
        ],
      },
      {
        name: "Core",
        exercises: [
          time("saturday-plank-hollow", "Plank / Hollow body hold", 2, 45, {
            restSeconds: 60,
            isBareMinimum: true,
            notes: "Written range: 2x30-60 sec. Rest 60 sec.",
          }),
          time("saturday-copenhagen-plank", "Copenhagen plank", 2, 30, {
            restSeconds: 60,
            notes: "Each side. Rest 60 sec.",
          }),
        ],
      },
      {
        name: "Mobility",
        exercises: [
          reps("saturday-9090-hip-rotations", "90/90 hip rotations", 1, 6, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("saturday-couch-stretch", "Couch stretch", 1, 60, {
            isBareMinimum: true,
            notes: "Each side.",
          }),
          time("saturday-thoracic-cat-cow", "Thoracic rotations / Cat-cow", 1, 90),
          time("saturday-pancake-straddle", "Pancake / Straddle stretch", 1, 60),
        ],
      },
    ],
  },
];
