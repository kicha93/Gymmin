export type ExerciseImageAssetKey = string;

const exerciseImageAssetKeysById: Record<string, ExerciseImageAssetKey[]> = {
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
  "bench-press-one-arm-floor-press-91": ["bench-press-one-arm-floor-press-91/start", "bench-press-one-arm-floor-press-91/end"],
  "bench-press-reverse-grip-barbell-bench-press-93": ["bench-press-reverse-grip-barbell-bench-press-93/start", "bench-press-reverse-grip-barbell-bench-press-93/end"],
  "bench-press-reverse-grip-incline-bench-press-94": ["bench-press-reverse-grip-incline-bench-press-94/start", "bench-press-reverse-grip-incline-bench-press-94/end"],
  "bench-press-single-arm-cable-chest-press-95": ["bench-press-single-arm-cable-chest-press-95/start", "bench-press-single-arm-cable-chest-press-95/end"],
  "bench-press-single-arm-dumbbell-bench-press-96": ["bench-press-single-arm-dumbbell-bench-press-96/start", "bench-press-single-arm-dumbbell-bench-press-96/end"],
  "bench-press-smith-machine-bench-press-97": ["bench-press-smith-machine-bench-press-97/start", "bench-press-smith-machine-bench-press-97/end"],
  "bench-press-swiss-ball-dumbbell-chest-press-98": ["bench-press-swiss-ball-dumbbell-chest-press-98/start", "bench-press-swiss-ball-dumbbell-chest-press-98/end"],
  "curl-alternating-dumbbell-biceps-curl-323": ["curl-alternating-dumbbell-biceps-curl-323/start", "curl-alternating-dumbbell-biceps-curl-323/end"],
  "curl-alternating-dumbbell-biceps-curl-on-swiss-ball-324": ["curl-alternating-dumbbell-biceps-curl-on-swiss-ball-324/start", "curl-alternating-dumbbell-biceps-curl-on-swiss-ball-324/end"],
  "curl-alternating-incline-dumbbell-biceps-curl-325": ["curl-alternating-incline-dumbbell-biceps-curl-325/start", "curl-alternating-incline-dumbbell-biceps-curl-325/end"],
  "curl-barbell-biceps-curl-326": ["curl-barbell-biceps-curl-326/start", "curl-barbell-biceps-curl-326/end"]
};

export function getExerciseImageAssetKeys(exerciseId: string): ExerciseImageAssetKey[] {
  return exerciseImageAssetKeysById[exerciseId] ?? [];
}
