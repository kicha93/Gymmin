import { advancedExerciseProfiles } from "./advancedExerciseProfiles.generated";
import { resolveExerciseId, type ExerciseLanguage, type InfluenceScore, type MuscleKey } from "./exercises";

export const advancedDisplayFamilyIds = [
  "chest",
  "shoulders",
  "triceps",
  "elbowFlexors",
  "forearms",
  "abs",
  "obliques",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "upperBack",
  "spinalErectors"
] as const;

export type AdvancedDisplayFamilyId = (typeof advancedDisplayFamilyIds)[number];
export type AdvancedMuscleSide = "front" | "back" | "both";

export const advancedMuscleSubdivisionIds = [
  "chest.clavicular",
  "chest.sternocostal",
  "chest.abdominal",
  "shoulders.anteriorDeltoid",
  "shoulders.lateralDeltoid",
  "shoulders.posteriorDeltoid",
  "triceps.longHead",
  "triceps.lateralHead",
  "triceps.medialHead",
  "elbowFlexors.bicepsLongHead",
  "elbowFlexors.bicepsShortHead",
  "elbowFlexors.brachialis",
  "forearms.flexors",
  "forearms.extensors",
  "forearms.brachioradialis",
  "abs.rectusAbdominis",
  "abs.transversusAbdominis",
  "obliques.externalOblique",
  "obliques.internalOblique",
  "quadriceps.rectusFemoris",
  "quadriceps.vastusLateralis",
  "quadriceps.vastusMedialis",
  "quadriceps.vastusIntermedius",
  "hamstrings.bicepsFemorisLongHead",
  "hamstrings.bicepsFemorisShortHead",
  "hamstrings.semitendinosus",
  "hamstrings.semimembranosus",
  "glutes.gluteusMaximus",
  "glutes.gluteusMedius",
  "glutes.gluteusMinimus",
  "calves.gastrocnemius",
  "calves.soleus",
  "upperBack.trapeziusUpper",
  "upperBack.trapeziusMiddle",
  "upperBack.trapeziusLower",
  "upperBack.rhomboids",
  "spinalErectors.thoracic",
  "spinalErectors.lumbar"
] as const;

export type AdvancedMuscleSubdivisionId = (typeof advancedMuscleSubdivisionIds)[number];

export type AdvancedDisplayFamily = {
  id: AdvancedDisplayFamilyId;
  names: Record<ExerciseLanguage, string>;
  standardMuscleKeys: readonly MuscleKey[];
};

export type AdvancedMuscleSubdivision = {
  anatomyRegionIds: readonly string[];
  displayFamilyId: AdvancedDisplayFamilyId;
  id: AdvancedMuscleSubdivisionId;
  isAnatomyVisible: boolean;
  names: Record<ExerciseLanguage, string>;
  side: AdvancedMuscleSide;
  standardParentMuscle: MuscleKey;
};

export const advancedDisplayFamilies: readonly AdvancedDisplayFamily[] = [
  family("chest", "Klatka piersiowa", "Chest", ["chest"]),
  family("shoulders", "Barki", "Shoulders", ["shoulders"]),
  family("triceps", "Tricepsy", "Triceps", ["triceps"]),
  family("elbowFlexors", "Zginacze łokcia", "Elbow flexors", ["biceps"]),
  family("forearms", "Przedramiona", "Forearms", ["forearm"]),
  family("abs", "Mięśnie brzucha", "Abdominals", ["abs"]),
  family("obliques", "Mięśnie skośne brzucha", "Obliques", ["obliques"]),
  family("quadriceps", "Mięśnie czworogłowe uda", "Quadriceps", ["quads"]),
  family("hamstrings", "Mięśnie tylnej części uda", "Hamstrings", ["hamstrings"]),
  family("glutes", "Pośladki", "Glutes", ["glutes"]),
  family("calves", "Łydki", "Calves", ["calves"]),
  // Product/display family. Rhomboids are not modeled as an anatomical child of trapezius.
  family("upperBack", "Górne plecy", "Upper back", ["traps"]),
  family("spinalErectors", "Prostowniki grzbietu", "Spinal erectors", ["lowerBack"])
];

export const advancedMuscleSubdivisions: readonly AdvancedMuscleSubdivision[] = [
  subdivision("chest.clavicular", "chest", "chest", "Część obojczykowa", "Clavicular region", "front", ["left_pectoralis_major", "right_pectoralis_major"]),
  subdivision("chest.sternocostal", "chest", "chest", "Część mostkowo-żebrowa", "Sternocostal region", "front", ["left_pectoralis_major", "right_pectoralis_major"]),
  subdivision("chest.abdominal", "chest", "chest", "Część brzuszna (dolna)", "Abdominal (lower) region", "front", ["left_pectoralis_major", "right_pectoralis_major"]),
  subdivision("shoulders.anteriorDeltoid", "shoulders", "shoulders", "Akton przedni", "Anterior deltoid", "front", ["left_deltoid", "right_deltoid"]),
  subdivision("shoulders.lateralDeltoid", "shoulders", "shoulders", "Akton boczny", "Lateral deltoid", "front", ["left_deltoid", "right_deltoid"]),
  subdivision("shoulders.posteriorDeltoid", "shoulders", "shoulders", "Akton tylny", "Posterior deltoid", "back", ["left_posterior_deltoid", "right_posterior_deltoid"]),
  subdivision("triceps.longHead", "triceps", "triceps", "Głowa długa", "Long head", "back", ["left_triceps_brachii", "right_triceps_brachii"]),
  subdivision("triceps.lateralHead", "triceps", "triceps", "Głowa boczna", "Lateral head", "back", ["left_triceps_brachii", "right_triceps_brachii"]),
  subdivision("triceps.medialHead", "triceps", "triceps", "Głowa przyśrodkowa", "Medial head", "back", [], false),
  subdivision("elbowFlexors.bicepsLongHead", "elbowFlexors", "biceps", "Głowa długa bicepsa", "Biceps long head", "front", ["left_biceps_brachii", "right_biceps_brachii"]),
  subdivision("elbowFlexors.bicepsShortHead", "elbowFlexors", "biceps", "Głowa krótka bicepsa", "Biceps short head", "front", ["left_biceps_brachii", "right_biceps_brachii"]),
  subdivision("elbowFlexors.brachialis", "elbowFlexors", "biceps", "Mięsień ramienny", "Brachialis", "front", [], false),
  subdivision("forearms.flexors", "forearms", "forearm", "Zginacze nadgarstka i palców", "Wrist and finger flexors", "front", ["left_forearm_flexors", "right_forearm_flexors"]),
  subdivision("forearms.extensors", "forearms", "forearm", "Prostowniki nadgarstka i palców", "Wrist and finger extensors", "back", ["left_forearm_posterior", "right_forearm_posterior"]),
  subdivision("forearms.brachioradialis", "forearms", "forearm", "Mięsień ramienno-promieniowy", "Brachioradialis", "both", [], false),
  subdivision("abs.rectusAbdominis", "abs", "abs", "Mięsień prosty brzucha", "Rectus abdominis", "front", ["left_rectus_abdominis", "right_rectus_abdominis"]),
  subdivision("abs.transversusAbdominis", "abs", "abs", "Mięsień poprzeczny brzucha", "Transversus abdominis", "front", [], false),
  subdivision("obliques.externalOblique", "obliques", "obliques", "Mięsień skośny zewnętrzny", "External oblique", "front", ["left_external_oblique", "right_external_oblique"]),
  subdivision("obliques.internalOblique", "obliques", "obliques", "Mięsień skośny wewnętrzny", "Internal oblique", "front", [], false),
  subdivision("quadriceps.rectusFemoris", "quadriceps", "quads", "Mięsień prosty uda", "Rectus femoris", "front", ["left_quadriceps_femoris", "right_quadriceps_femoris"]),
  subdivision("quadriceps.vastusLateralis", "quadriceps", "quads", "Mięsień obszerny boczny", "Vastus lateralis", "front", ["left_quadriceps_femoris", "right_quadriceps_femoris"]),
  subdivision("quadriceps.vastusMedialis", "quadriceps", "quads", "Mięsień obszerny przyśrodkowy", "Vastus medialis", "front", ["left_quadriceps_femoris", "right_quadriceps_femoris"]),
  subdivision("quadriceps.vastusIntermedius", "quadriceps", "quads", "Mięsień obszerny pośredni", "Vastus intermedius", "front", [], false),
  subdivision("hamstrings.bicepsFemorisLongHead", "hamstrings", "hamstrings", "Dwugłowy uda — głowa długa", "Biceps femoris long head", "back", ["left_posterior_thigh_lateral", "right_posterior_thigh_lateral"]),
  subdivision("hamstrings.bicepsFemorisShortHead", "hamstrings", "hamstrings", "Dwugłowy uda — głowa krótka", "Biceps femoris short head", "back", [], false),
  subdivision("hamstrings.semitendinosus", "hamstrings", "hamstrings", "Mięsień półścięgnisty", "Semitendinosus", "back", ["left_posterior_thigh_medial", "right_posterior_thigh_medial"]),
  subdivision("hamstrings.semimembranosus", "hamstrings", "hamstrings", "Mięsień półbłoniasty", "Semimembranosus", "back", ["left_posterior_thigh_medial", "right_posterior_thigh_medial"]),
  subdivision("glutes.gluteusMaximus", "glutes", "glutes", "Mięsień pośladkowy wielki", "Gluteus maximus", "back", ["left_gluteus_maximus_medius", "right_gluteus_maximus_medius"]),
  subdivision("glutes.gluteusMedius", "glutes", "glutes", "Mięsień pośladkowy średni", "Gluteus medius", "back", ["left_gluteus_maximus_medius", "right_gluteus_maximus_medius"]),
  subdivision("glutes.gluteusMinimus", "glutes", "glutes", "Mięsień pośladkowy mały", "Gluteus minimus", "back", [], false),
  subdivision("calves.gastrocnemius", "calves", "calves", "Mięsień brzuchaty łydki", "Gastrocnemius", "back", ["left_gastrocnemius_soleus", "right_gastrocnemius_soleus"]),
  subdivision("calves.soleus", "calves", "calves", "Mięsień płaszczkowaty", "Soleus", "back", ["left_gastrocnemius_soleus", "right_gastrocnemius_soleus"]),
  subdivision("upperBack.trapeziusUpper", "upperBack", "traps", "Mięsień czworoboczny — część górna", "Upper trapezius", "back", ["neck_and_upper_trapezius_center"]),
  subdivision("upperBack.trapeziusMiddle", "upperBack", "traps", "Mięsień czworoboczny — część środkowa", "Middle trapezius", "back", ["left_trapezius_rhomboid_region", "right_trapezius_rhomboid_region"]),
  subdivision("upperBack.trapeziusLower", "upperBack", "traps", "Mięsień czworoboczny — część dolna", "Lower trapezius", "back", ["left_trapezius_rhomboid_region", "right_trapezius_rhomboid_region"]),
  subdivision("upperBack.rhomboids", "upperBack", "traps", "Mięśnie równoległoboczne", "Rhomboids", "back", ["left_trapezius_rhomboid_region", "right_trapezius_rhomboid_region"]),
  subdivision("spinalErectors.thoracic", "spinalErectors", "lowerBack", "Odcinek piersiowy", "Thoracic region", "back", ["left_erector_spinae_thoracic", "right_erector_spinae_thoracic"]),
  subdivision("spinalErectors.lumbar", "spinalErectors", "lowerBack", "Odcinek lędźwiowy", "Lumbar region", "back", ["lower_back_lumbar_region_center", "left_lumbar_erector_spinae", "right_lumbar_erector_spinae"])
];

export type AdvancedMappedParentProfile = {
  confidence: "high" | "medium";
  engagement: readonly (readonly [AdvancedMuscleSubdivisionId, InfluenceScore])[];
  ruleId: string;
  standardParentMuscle: MuscleKey;
  status: "mapped";
};

export type AdvancedUnmappedParentProfile = {
  reason: string;
  standardParentMuscle: MuscleKey;
  status: "intentionallyNotDetailed" | "needsReview";
};

export type AdvancedParentProfile = AdvancedMappedParentProfile | AdvancedUnmappedParentProfile;

export type AdvancedExerciseProfile = {
  parents: readonly AdvancedParentProfile[];
};

const subdivisionsById = new Map(advancedMuscleSubdivisions.map((item) => [item.id, item]));
const displayFamiliesById = new Map(advancedDisplayFamilies.map((item) => [item.id, item]));

export function getAdvancedMuscleSubdivision(id: AdvancedMuscleSubdivisionId) {
  return subdivisionsById.get(id);
}

export function getAdvancedDisplayFamily(id: AdvancedDisplayFamilyId) {
  return displayFamiliesById.get(id);
}

export function getAdvancedExerciseProfile(exerciseId: string): AdvancedExerciseProfile | undefined {
  return advancedExerciseProfiles[resolveExerciseId(exerciseId)];
}

export function getAdvancedMappedParents(exerciseId: string) {
  return getAdvancedExerciseProfile(exerciseId)?.parents.filter(
    (parent): parent is AdvancedMappedParentProfile => parent.status === "mapped"
  ) ?? [];
}

export function getAdvancedAnatomyRegionLevels(
  exerciseId: string,
  side: "front" | "back"
): Record<string, InfluenceScore> {
  const levels: Record<string, InfluenceScore> = {};

  for (const parent of getAdvancedMappedParents(exerciseId)) {
    for (const [subdivisionId, level] of parent.engagement) {
      const subdivision = getAdvancedMuscleSubdivision(subdivisionId);
      if (!subdivision?.isAnatomyVisible
        || (subdivision.side !== "both" && subdivision.side !== side)) {
        continue;
      }
      for (const regionId of subdivision.anatomyRegionIds) {
        levels[regionId] = Math.max(levels[regionId] ?? 0, level) as InfluenceScore;
      }
    }
  }

  return levels;
}

function family(
  id: AdvancedDisplayFamilyId,
  pl: string,
  en: string,
  standardMuscleKeys: readonly MuscleKey[]
): AdvancedDisplayFamily {
  return { id, names: { en, pl }, standardMuscleKeys };
}

function subdivision(
  id: AdvancedMuscleSubdivisionId,
  displayFamilyId: AdvancedDisplayFamilyId,
  standardParentMuscle: MuscleKey,
  pl: string,
  en: string,
  side: AdvancedMuscleSide,
  anatomyRegionIds: readonly string[],
  isAnatomyVisible = true
): AdvancedMuscleSubdivision {
  return {
    anatomyRegionIds,
    displayFamilyId,
    id,
    isAnatomyVisible,
    names: { en, pl },
    side,
    standardParentMuscle
  };
}
