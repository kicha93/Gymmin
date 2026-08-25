import { resolveExerciseId } from "./exercises";

export type ExerciseImageAssetKey = string;

const exerciseImageAssetKeysById: Record<string, ExerciseImageAssetKey[]> = {
  "assisted-pull-up-machine": ["assisted-pull-up-machine/start", "assisted-pull-up-machine/end"],
  "banded-exercises-ab-twist-1": ["banded-exercises-ab-twist-1/start", "banded-exercises-ab-twist-1/end"],
  "banded-exercises-back-extension-2": ["banded-exercises-back-extension-2/start", "banded-exercises-back-extension-2/end"],
  "banded-exercises-bicycle-crunch-3": ["banded-exercises-bicycle-crunch-3/start", "banded-exercises-bicycle-crunch-3/end"],
  "banded-exercises-calf-raises-4": ["banded-exercises-calf-raises-4/start", "banded-exercises-calf-raises-4/end"],
  "banded-exercises-clam-shells-5": ["banded-exercises-clam-shells-5/start", "banded-exercises-clam-shells-5/end"],
  "banded-exercises-curl-6": ["banded-exercises-curl-6/start", "banded-exercises-curl-6/end"],
  "banded-exercises-deadbug-7": ["banded-exercises-deadbug-7/start", "banded-exercises-deadbug-7/end"],
  "bench-press-barbell-bench-press-76": ["bench-press-barbell-bench-press-76/start", "bench-press-barbell-bench-press-76/end"],
  "bench-press-barbell-floor-press-78": ["bench-press-barbell-floor-press-78/start", "bench-press-barbell-floor-press-78/end"],
  "bench-press-close-grip-barbell-bench-press-80": ["bench-press-close-grip-barbell-bench-press-80/start", "bench-press-close-grip-barbell-bench-press-80/end"],
  "bench-press-decline-dumbbell-bench-press-81": ["bench-press-decline-dumbbell-bench-press-81/start", "bench-press-decline-dumbbell-bench-press-81/end"],
  "bench-press-dumbbell-bench-press-82": ["bench-press-dumbbell-bench-press-82/start", "bench-press-dumbbell-bench-press-82/end"],
  "bench-press-dumbbell-floor-press-83": ["bench-press-dumbbell-floor-press-83/start", "bench-press-dumbbell-floor-press-83/end"],
  "bench-press-incline-barbell-bench-press-84": ["bench-press-incline-barbell-bench-press-84/start", "bench-press-incline-barbell-bench-press-84/end"],
  "bench-press-incline-dumbbell-bench-press-85": ["bench-press-incline-dumbbell-bench-press-85/start", "bench-press-incline-dumbbell-bench-press-85/end"],
  "bench-press-incline-smith-machine-bench-press-86": ["bench-press-incline-smith-machine-bench-press-86/start", "bench-press-incline-smith-machine-bench-press-86/end"],
  "bench-press-kettlebell-chest-press-88": ["bench-press-kettlebell-chest-press-88/start", "bench-press-kettlebell-chest-press-88/end"],
  "bench-press-neutral-grip-dumbbell-bench-press-89": ["bench-press-neutral-grip-dumbbell-bench-press-89/start", "bench-press-neutral-grip-dumbbell-bench-press-89/end"],
  "bench-press-neutral-grip-dumbbell-incline-bench-press-90": ["bench-press-neutral-grip-dumbbell-incline-bench-press-90/start", "bench-press-neutral-grip-dumbbell-incline-bench-press-90/end"],
  "bench-press-reverse-grip-barbell-bench-press-93": ["bench-press-reverse-grip-barbell-bench-press-93/start", "bench-press-reverse-grip-barbell-bench-press-93/end"],
  "bench-press-reverse-grip-incline-bench-press-94": ["bench-press-reverse-grip-incline-bench-press-94/start", "bench-press-reverse-grip-incline-bench-press-94/end"],
  "bench-press-smith-machine-bench-press-97": ["bench-press-smith-machine-bench-press-97/start", "bench-press-smith-machine-bench-press-97/end"],
  "chest-press": ["chest-press/start", "chest-press/end"],
  "chest-supported-machine-row": ["chest-supported-machine-row/start", "chest-supported-machine-row/end"],
  "curl-barbell-biceps-curl-326": ["curl-barbell-biceps-curl-326/start", "curl-barbell-biceps-curl-326/end"],
  "curl-cable-biceps-curl-331": ["curl-cable-biceps-curl-331/start", "curl-cable-biceps-curl-331/end"],
  "curl-dumbbell-biceps-curl-339": ["curl-dumbbell-biceps-curl-339/start", "curl-dumbbell-biceps-curl-339/end"],
  "curl-incline-dumbbell-biceps-curl-347": ["curl-incline-dumbbell-biceps-curl-347/start", "curl-incline-dumbbell-biceps-curl-347/end"],
  "deadlift-barbell-deadlift-371": ["deadlift-barbell-deadlift-371/start", "deadlift-barbell-deadlift-371/end"],
  "deadlift-romanian-deadlift-374": ["deadlift-romanian-deadlift-374/start", "deadlift-romanian-deadlift-374/end"],
  "glute-kickback": ["glute-kickback/start", "glute-kickback/end"],
  "hack-squat": ["hack-squat/start", "hack-squat/end"],
  "hip-abduction": ["hip-abduction/start", "hip-abduction/end"],
  "hip-adduction": ["hip-adduction/start", "hip-adduction/end"],
  "hip-thrust": ["hip-thrust/start", "hip-thrust/end"],
  "lateral-raise-dumbbell-lateral-raise-545": ["lateral-raise-dumbbell-lateral-raise-545/start", "lateral-raise-dumbbell-lateral-raise-545/end"],
  "leg-curl-leg-curl-574": ["leg-curl-leg-curl-574/start", "leg-curl-leg-curl-574/end"],
  "leg-raise-hanging-knee-raise-585": ["leg-raise-hanging-knee-raise-585/start", "leg-raise-hanging-knee-raise-585/end"],
  "lunge-dumbbell-bulgarian-split-squat-625": ["lunge-dumbbell-bulgarian-split-squat-625/start", "lunge-dumbbell-bulgarian-split-squat-625/end"],
  "machine-row": ["machine-row/start", "machine-row/end"],
  "pec-deck": ["pec-deck/start", "pec-deck/end"],
  "pull-up-lat-pulldown-913": ["pull-up-lat-pulldown-913/start", "pull-up-lat-pulldown-913/end"],
  "pull-up-pull-up-918": ["pull-up-pull-up-918/start", "pull-up-pull-up-918/end"],
  "reverse-pec-deck": ["reverse-pec-deck/start", "reverse-pec-deck/end"],
  "row-barbell-row-1034": ["row-barbell-row-1034/start", "row-barbell-row-1034/end"],
  "row-face-pull-1044": ["row-face-pull-1044/start", "row-face-pull-1044/end"],
  "row-seated-cable-row-1059": ["row-seated-cable-row-1059/start", "row-seated-cable-row-1059/end"],
  "seated-leg-curl": ["seated-leg-curl/start", "seated-leg-curl/end"],
  "shoulder-press": ["shoulder-press/start", "shoulder-press/end"],
  "shoulder-press-overhead-barbell-press-1125": ["shoulder-press-overhead-barbell-press-1125/start", "shoulder-press-overhead-barbell-press-1125/end"],
  "shoulder-press-overhead-dumbbell-press-1126": ["shoulder-press-overhead-dumbbell-press-1126/start", "shoulder-press-overhead-dumbbell-press-1126/end"],
  "shoulder-press-seated-dumbbell-shoulder-press-1128": ["shoulder-press-seated-dumbbell-shoulder-press-1128/start", "shoulder-press-seated-dumbbell-shoulder-press-1128/end"],
  "smith-machine-squat": ["smith-machine-squat/start", "smith-machine-squat/end"],
  "squat-barbell-back-squat-1251": ["squat-barbell-back-squat-1251/start", "squat-barbell-back-squat-1251/end"],
  "squat-barbell-front-squat-1253": ["squat-barbell-front-squat-1253/start", "squat-barbell-front-squat-1253/end"],
  "squat-leg-press-1285": ["squat-leg-press-1285/start", "squat-leg-press-1285/end"],
  "triceps-extension-cable-overhead-triceps-extension-1403": ["triceps-extension-cable-overhead-triceps-extension-1403/start", "triceps-extension-cable-overhead-triceps-extension-1403/end"]
};

const exerciseAnimationAssetKeyById: Record<string, ExerciseImageAssetKey> = {
  "squat-barbell-front-squat-1253": "squat-barbell-front-squat-1253/animation"
};

export function getExerciseImageAssetKeys(exerciseId: string): ExerciseImageAssetKey[] {
  return exerciseImageAssetKeysById[resolveExerciseId(exerciseId)] ?? [];
}

export function getExerciseAnimationAssetKey(exerciseId: string): ExerciseImageAssetKey | null {
  return exerciseAnimationAssetKeyById[resolveExerciseId(exerciseId)] ?? null;
}
