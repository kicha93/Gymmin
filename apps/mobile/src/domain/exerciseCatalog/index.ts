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
import { elliptical } from "./elliptical";
import { floorClimb } from "./floor-climb";
import { flye } from "./flye";
import { hipRaise } from "./hip-raise";
import { hipStability } from "./hip-stability";
import { hipSwing } from "./hip-swing";
import { hyperextension } from "./hyperextension";
import { indoorBike } from "./indoor-bike";
import { ladder } from "./ladder";
import { lateralRaise } from "./lateral-raise";
import { legCurl } from "./leg-curl";
import { legRaise } from "./leg-raise";
import { lunge } from "./lunge";
import { olympicLift } from "./olympic-lift";
import { plank } from "./plank";
import { plyo } from "./plyo";
import { pullUp } from "./pull-up";
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
  ...elliptical,
  ...floorClimb,
  ...flye,
  ...hipRaise,
  ...hipStability,
  ...hipSwing,
  ...hyperextension,
  ...indoorBike,
  ...ladder,
  ...lateralRaise,
  ...legCurl,
  ...legRaise,
  ...lunge,
  ...olympicLift,
  ...plank,
  ...plyo,
  ...pullUp,
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
  ...stairStepper,
  ...suspension,
  ...tire,
  ...totalBody,
  ...tricepsExtension,
  ...warmUp
] as const;

export const exercisesByGarminCategory = {
  "BANDED_EXERCISES": bandedExercises,
  "BATTLE_ROPE": battleRope,
  "BENCH_PRESS": benchPress,
  "BIKE_OUTDOOR": bikeOutdoor,
  "CALF_RAISE": calfRaise,
  "CARDIO": cardio,
  "CARRY": carry,
  "CHOP": chop,
  "CORE": core,
  "CRUNCH": crunch,
  "CURL": curl,
  "DEADLIFT": deadlift,
  "ELLIPTICAL": elliptical,
  "FLOOR_CLIMB": floorClimb,
  "FLYE": flye,
  "HIP_RAISE": hipRaise,
  "HIP_STABILITY": hipStability,
  "HIP_SWING": hipSwing,
  "HYPEREXTENSION": hyperextension,
  "INDOOR_BIKE": indoorBike,
  "LADDER": ladder,
  "LATERAL_RAISE": lateralRaise,
  "LEG_CURL": legCurl,
  "LEG_RAISE": legRaise,
  "LUNGE": lunge,
  "OLYMPIC_LIFT": olympicLift,
  "PLANK": plank,
  "PLYO": plyo,
  "PULL_UP": pullUp,
  "PUSH_UP": pushUp,
  "ROW": row,
  "RUN": run,
  "RUN_INDOOR": runIndoor,
  "SANDBAG": sandbag,
  "SHOULDER_PRESS": shoulderPress,
  "SHOULDER_STABILITY": shoulderStability,
  "SHRUG": shrug,
  "SIT_UP": sitUp,
  "SLED": sled,
  "SLEDGE_HAMMER": sledgeHammer,
  "SQUAT": squat,
  "STAIR_STEPPER": stairStepper,
  "SUSPENSION": suspension,
  "TIRE": tire,
  "TOTAL_BODY": totalBody,
  "TRICEPS_EXTENSION": tricepsExtension,
  "WARM_UP": warmUp
} as const;
