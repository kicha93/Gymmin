import { bandedExercises } from "./banded-exercises";
import { battleRope } from "./battle-rope";
import { benchPress } from "./bench-press";
import { bikeOutdoor } from "./bike-outdoor";
import { calfRaise } from "./calf-raise";
import { cardio } from "./cardio";
import { carry } from "./carry";
import { chop } from "./chop";
import { core } from "./core";
import { crunch } from "./crunch";
import { curl } from "./curl";
import { deadlift } from "./deadlift";
import { dorsiflexion } from "./dorsiflexion";
import { elliptical } from "./elliptical";
import { floorClimb } from "./floor-climb";
import { frontRaise } from "./front-raise";
import { goodMorning } from "./good-morning";
import { flye } from "./flye";
import { hipRaise } from "./hip-raise";
import { hipStability } from "./hip-stability";
import { hipSwing } from "./hip-swing";
import { hyperextension } from "./hyperextension";
import { indoorBike } from "./indoor-bike";
import { ladder } from "./ladder";
import { lateralRaise } from "./lateral-raise";
import { legCurl } from "./leg-curl";
import { legExtension } from "./leg-extension";
import { legRaise } from "./leg-raise";
import { lunge } from "./lunge";
import { olympicLift } from "./olympic-lift";
import { plank } from "./plank";
import { plyo } from "./plyo";
import { pullUp } from "./pull-up";
import { pullover } from "./pullover";
import { pushUp } from "./push-up";
import { row } from "./row";
import { run } from "./run";
import { runIndoor } from "./run-indoor";
import { sandbag } from "./sandbag";
import { shoulderPress } from "./shoulder-press";
import { shoulderStability } from "./shoulder-stability";
import { shrug } from "./shrug";
import { sitUp } from "./sit-up";
import { sled } from "./sled";
import { sledgeHammer } from "./sledge-hammer";
import { squat } from "./squat";
import { stepUp } from "./step-up";
import { stairStepper } from "./stair-stepper";
import { suspension } from "./suspension";
import { tire } from "./tire";
import { totalBody } from "./total-body";
import { tricepsExtension } from "./triceps-extension";
import { warmUp } from "./warm-up";

export const exercises = [
  ...bandedExercises,
  ...battleRope,
  ...benchPress,
  ...bikeOutdoor,
  ...calfRaise,
  ...cardio,
  ...carry,
  ...chop,
  ...core,
  ...crunch,
  ...curl,
  ...deadlift,
  ...dorsiflexion,
  ...elliptical,
  ...floorClimb,
  ...frontRaise,
  ...goodMorning,
  ...flye,
  ...hipRaise,
  ...hipStability,
  ...hipSwing,
  ...hyperextension,
  ...indoorBike,
  ...ladder,
  ...lateralRaise,
  ...legCurl,
  ...legExtension,
  ...legRaise,
  ...lunge,
  ...olympicLift,
  ...plank,
  ...plyo,
  ...pullUp,
  ...pullover,
  ...pushUp,
  ...row,
  ...run,
  ...runIndoor,
  ...sandbag,
  ...shoulderPress,
  ...shoulderStability,
  ...shrug,
  ...sitUp,
  ...sled,
  ...sledgeHammer,
  ...squat,
  ...stepUp,
  ...stairStepper,
  ...suspension,
  ...tire,
  ...totalBody,
  ...tricepsExtension,
  ...warmUp
] as const;

export const exercisesByCategory = exercises.reduce<Record<string, (typeof exercises)[number][]>>((groups, exercise) => {
  (groups[exercise.category] ??= []).push(exercise);
  return groups;
}, {});
