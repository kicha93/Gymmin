import type { TextInputProps } from "react-native";

export type WorkoutCreatorPhase = "form" | "profilePrompt";
export type LocalizedText = {
  en: string;
  pl: string;
};
export type WorkoutCreatorFieldKind = "text" | "textarea" | "singleChoice" | "multiChoice";
export type WorkoutCreatorValue = string | string[];
export type WorkoutCreatorDraft = Record<string, WorkoutCreatorValue>;
export type WorkoutCreatorField = {
  defaultValue?: LocalizedText;
  id: string;
  kind: WorkoutCreatorFieldKind;
  keyboardType?: TextInputProps["keyboardType"];
  label: LocalizedText;
  minValue?: number;
  maxValue?: number;
  options?: WorkoutCreatorOption[];
  placeholder?: LocalizedText;
  required?: boolean;
};
export type WorkoutCreatorOption = LocalizedText & { id: string };
export type WorkoutCreatorSection = {
  id: string;
  title: LocalizedText;
  fields: WorkoutCreatorField[];
};
export type WorkoutCreatorProfile = {
  draft: WorkoutCreatorDraft;
  id: string;
  name: string;
};

export const workoutCreatorProfileLimits = {
  draftFieldCount: 100,
  draftFieldKeyLength: 120,
  draftListLength: 50,
  draftListValueLength: 500,
  draftTextLength: 4_000,
  idLength: 128,
  nameLength: 120,
  profileCount: 25
} as const;

const deprecatedWorkoutCreatorFieldIds = new Set(["readyWarmupSet"]);

const yesNoOptions: WorkoutCreatorOption[] = [
  { id: "yes", en: "Yes", pl: "Tak" },
  { id: "no", en: "No", pl: "Nie" }
];

export const workoutCreatorSections: WorkoutCreatorSection[] = [
  {
    id: "goals",
    title: { en: "Training goals", pl: "Cele treningowe" },
    fields: [
      {
        id: "primaryGoal",
        kind: "singleChoice",
        required: true,
        label: { en: "What is your main training goal?", pl: "Jaki jest Twój główny cel treningowy?" },
        options: [
          { id: "muscleGain", en: "Muscle gain", pl: "Budowa masy mięśniowej" },
          { id: "fatLoss", en: "Fat loss", pl: "Redukcja tkanki tłuszczowej" },
          { id: "strength", en: "Strength increase", pl: "Zwiększenie siły" },
          { id: "conditioning", en: "Conditioning", pl: "Poprawa kondycji" },
          { id: "health", en: "Health improvement", pl: "Poprawa zdrowia" },
          { id: "recomposition", en: "Body recomposition", pl: "Sylwetka „rekompozycja”" }
        ]
      },
      {
        id: "secondaryGoals",
        kind: "textarea",
        label: { en: "What are your secondary goals?", pl: "Jakie są Twoje cele drugorzędne?" }
      },
      {
        id: "targetDate",
        kind: "text",
        label: { en: "Do you have a specific deadline for the result?", pl: "Czy masz konkretną datę, do której chcesz osiągnąć określony rezultat?" },
        placeholder: { en: "e.g. in 12 weeks, by September", pl: "np. za 12 tygodni, do września" }
      },
      {
        id: "bodyPartsToDevelop",
        kind: "text",
        label: { en: "Which body parts do you want to develop most?", pl: "Jakie partie ciała najbardziej chciałbyś rozwinąć?" }
      }
    ]
  },
  {
    id: "experience",
    title: { en: "Training experience", pl: "Doświadczenie treningowe" },
    fields: [
      {
        id: "age",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 13,
        maxValue: 100,
        label: { en: "How old are you?", pl: "Ile masz lat?" }
      },
      {
        id: "gender",
        kind: "singleChoice",
        label: { en: "What is your sex?", pl: "Płeć" },
        options: [
          { id: "male", en: "Male", pl: "Mężczyzna" },
          { id: "female", en: "Female", pl: "Kobieta" },
          { id: "other", en: "Other / prefer not to say", pl: "Inna / wolę nie podawać" }
        ]
      },
      {
        id: "height",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 100,
        maxValue: 250,
        label: { en: "What is your height?", pl: "Jaki jest Twój wzrost?" },
        placeholder: { en: "cm", pl: "cm" }
      },
      {
        id: "bodyWeight",
        kind: "text",
        keyboardType: "decimal-pad",
        minValue: 30,
        maxValue: 350,
        label: { en: "What is your current body weight?", pl: "Jaka jest Twoja aktualna masa ciała?" },
        placeholder: { en: "kg", pl: "kg" }
      },
      {
        id: "strengthTrainingExperience",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many years have you trained strength?", pl: "Jak długo trenujesz siłowo w latach?" },
        maxValue: 70
      },
      {
        id: "currentTrainingRegularity",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many days per week do you currently train regularly?", pl: "Ile dni w tygodniu obecnie trenujesz regularnie?" },
        maxValue: 7
      },
      {
        id: "likedExercises",
        kind: "textarea",
        label: { en: "Which exercises do you like?", pl: "Jakie ćwiczenia lubisz wykonywać?" }
      },
      {
        id: "dislikedExercises",
        kind: "textarea",
        label: { en: "Which exercises do you dislike or avoid?", pl: "Jakich ćwiczeń nie lubisz lub unikasz?" }
      },
      {
        id: "currentStrengthResults",
        kind: "textarea",
        label: { en: "What are your current strength results in basic lifts?", pl: "Jakie są Twoje obecne wyniki siłowe w podstawowych ćwiczeniach (przysiad, martwy ciąg, wyciskanie)?" },
        placeholder: { en: "Squat, deadlift, bench press", pl: "Przysiad, martwy ciąg, wyciskanie" }
      }
    ]
  },
  {
    id: "health",
    title: { en: "Health and limitations", pl: "Zdrowie i ograniczenia" },
    fields: [
      {
        id: "healthStatus",
        kind: "singleChoice",
        required: true,
        label: { en: "How should health limitations be treated in this plan?", pl: "Jak uwzględnić ograniczenia zdrowotne w tym planie?" },
        options: [
          { id: "none", en: "I have no known limitations", pl: "Nie mam znanych ograniczeń" },
          { id: "described", en: "I have limitations described below", pl: "Mam ograniczenia opisane poniżej" },
          { id: "unsure", en: "I am unsure", pl: "Nie mam pewności" }
        ]
      },
      {
        id: "injuries",
        kind: "textarea",
        label: { en: "Do you have any injuries?", pl: "Czy masz jakiekolwiek kontuzje lub urazy?" }
      },
      {
        id: "jointPain",
        kind: "textarea",
        label: { en: "Do you feel joint, back, knee, shoulder or hip pain?", pl: "Czy odczuwasz bóle stawów, pleców, kolan, barków lub bioder?" }
      },
      {
        id: "surgeries",
        kind: "textarea",
        label: { en: "Have you had any surgeries?", pl: "Czy przeszedłeś jakieś operacje?" }
      },
      {
        id: "doctorLimitations",
        kind: "textarea",
        label: { en: "Has a doctor recommended limiting physical activity?", pl: "Czy lekarz zalecił Ci ograniczenie aktywności fizycznej?" }
      },
      {
        id: "chronicDiseases",
        kind: "multiChoice",
        label: { en: "Do you have any chronic diseases?", pl: "Czy cierpisz na choroby przewlekłe?" },
        options: [
          { id: "none", en: "None", pl: "Brak" },
          { id: "hypertension", en: "Hypertension", pl: "Nadciśnienie" },
          { id: "diabetes", en: "Diabetes", pl: "Cukrzyca" },
          { id: "heartDisease", en: "Heart disease", pl: "Choroby serca" },
          { id: "hormonal", en: "Hormonal issues", pl: "Problemy hormonalne" },
          { id: "other", en: "Other (describe below)", pl: "Inne (opisz poniżej)" }
        ]
      },
      {
        id: "medications",
        kind: "textarea",
        label: { en: "Do you take medications that may affect performance or recovery?", pl: "Czy przyjmujesz leki mogące wpływać na wydolność lub regenerację?" }
      }
    ]
  },
  {
    id: "lifestyle",
    title: { en: "Lifestyle", pl: "Styl życia" },
    fields: [
      {
        id: "workType",
        kind: "singleChoice",
        label: { en: "What type of work do you do?", pl: "Jaki rodzaj pracy wykonujesz?" },
        options: [
          { id: "sedentary", en: "Sedentary", pl: "Siedząca" },
          { id: "physical", en: "Physical", pl: "Fizyczna" },
          { id: "mixed", en: "Mixed", pl: "Mieszana" }
        ]
      },
      {
        id: "sittingHours",
        kind: "text",
        keyboardType: "decimal-pad",
        minValue: 0,
        maxValue: 24,
        label: { en: "How many hours per day do you spend sitting?", pl: "Ile godzin dziennie spędzasz siedząc?" }
      },
      {
        id: "sleepHours",
        kind: "text",
        keyboardType: "decimal-pad",
        minValue: 1,
        maxValue: 16,
        label: { en: "How many hours do you sleep on average?", pl: "Ile średnio śpisz na dobę?" }
      },
      {
        id: "sleepQuality",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 1,
        maxValue: 10,
        label: { en: "How do you rate your sleep quality on a 1-10 scale?", pl: "Jak oceniasz jakość swojego snu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "stressLevel",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 1,
        maxValue: 10,
        label: { en: "What is your stress level on a 1-10 scale?", pl: "Jak wygląda Twój poziom stresu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "dailySteps",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 0,
        maxValue: 100000,
        label: { en: "How many steps do you take on average per day?", pl: "Ile kroków wykonujesz przeciętnie dziennie?" }
      }
    ]
  },
  {
    id: "logistics",
    title: { en: "Training logistics", pl: "Logistyka treningów" },
    fields: [
      {
        id: "trainingDaysPerWeek",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 1,
        maxValue: 7,
        required: true,
        label: { en: "How many days per week can you realistically train?", pl: "Ile dni w tygodniu realnie możesz trenować?" }
      },
      {
        id: "sessionDuration",
        kind: "text",
        keyboardType: "number-pad",
        minValue: 15,
        label: { en: "How much time can you spend on one workout in minutes?", pl: "Ile czasu możesz przeznaczyć na jeden trening w minutach?" },
        maxValue: 300,
        required: true,
        placeholder: { en: "minutes", pl: "minuty" }
      },
      {
        id: "availableEquipment",
        kind: "multiChoice",
        required: true,
        label: { en: "Which equipment can you actually use?", pl: "Z jakiego sprzętu realnie możesz korzystać?" },
        options: [
          { id: "bodyweight", en: "Bodyweight", pl: "Masa ciała" },
          { id: "barbell", en: "Barbell and plates", pl: "Sztanga i obciążenia" },
          { id: "dumbbells", en: "Dumbbells", pl: "Hantle" },
          { id: "machines", en: "Machines", pl: "Maszyny" },
          { id: "cables", en: "Cable station", pl: "Wyciągi" },
          { id: "bands", en: "Resistance bands", pl: "Gumy oporowe" },
          { id: "kettlebells", en: "Kettlebells", pl: "Kettlebell" },
          { id: "bench", en: "Bench", pl: "Ławka" },
          { id: "pullupBar", en: "Pull-up bar", pl: "Drążek" }
        ]
      },
      {
        id: "gymAccess",
        kind: "singleChoice",
        label: { en: "Do you have access to a full gym?", pl: "Czy masz dostęp do pełnowymiarowej siłowni?" },
        options: yesNoOptions
      },
      {
        id: "homeTraining",
        kind: "singleChoice",
        label: { en: "Will you sometimes train at home?", pl: "Czy czasami będziesz trenować w domu?" },
        options: yesNoOptions
      },
      {
        id: "splitPreference",
        kind: "singleChoice",
        label: { en: "Do you prefer full-body training or a split?", pl: "Czy preferujesz trening całego ciała (FBW) czy podział na partie (split)?" },
        options: [
          { id: "fullBody", en: "Full body", pl: "FBW" },
          { id: "split", en: "Split", pl: "Split" },
          { id: "noPreference", en: "No preference", pl: "Bez preferencji" }
        ]
      }
    ]
  }
];

export function cloneCreatorDraft(draft: WorkoutCreatorDraft): WorkoutCreatorDraft {
  return Object.fromEntries(
    Object.entries(draft)
      .filter(([key]) => !deprecatedWorkoutCreatorFieldIds.has(key))
      .map(([key, value]) => [key, normalizeCreatorFieldValue(key, Array.isArray(value) ? [...value] : value)])
  );
}

export function normalizeWorkoutCreatorProfiles(value: unknown): WorkoutCreatorProfile[] {
  if (!Array.isArray(value)) return [];

  const profiles: WorkoutCreatorProfile[] = [];
  const seenIds = new Set<string>();

  for (const candidate of value.slice(0, workoutCreatorProfileLimits.profileCount)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    const id = typeof record.id === "string"
      ? record.id.trim().slice(0, workoutCreatorProfileLimits.idLength)
      : "";
    const name = typeof record.name === "string"
      ? record.name.trim().slice(0, workoutCreatorProfileLimits.nameLength)
      : "";
    if (!id || !name || seenIds.has(id)) continue;

    const rawDraft = record.draft && typeof record.draft === "object" && !Array.isArray(record.draft)
      ? record.draft as Record<string, unknown>
      : {};
    const draftEntries: Array<[string, WorkoutCreatorValue]> = [];
    for (const [rawKey, rawValue] of Object.entries(rawDraft)
      .slice(0, workoutCreatorProfileLimits.draftFieldCount)) {
      const key = rawKey.trim().slice(0, workoutCreatorProfileLimits.draftFieldKeyLength);
      if (!key || deprecatedWorkoutCreatorFieldIds.has(key)) continue;
      if (typeof rawValue === "string") {
        draftEntries.push([key, normalizeCreatorFieldValue(key, rawValue.slice(0, workoutCreatorProfileLimits.draftTextLength))]);
      } else if (Array.isArray(rawValue) && rawValue.every((item) => typeof item === "string")) {
        draftEntries.push([key, normalizeCreatorFieldValue(key, rawValue
          .slice(0, workoutCreatorProfileLimits.draftListLength)
          .map((item) => item.slice(0, workoutCreatorProfileLimits.draftListValueLength)))]);
      }
    }

    seenIds.add(id);
    profiles.push({ draft: Object.fromEntries(draftEntries), id, name });
  }

  return profiles;
}

const fieldsById = new Map(workoutCreatorSections.flatMap((section) => section.fields).map((field) => [field.id, field]));

export function normalizeCreatorFieldValue(fieldId: string, value: WorkoutCreatorValue): WorkoutCreatorValue {
  const field = fieldsById.get(fieldId);
  if (!field?.options?.length) return value;
  const normalizeOption = (candidate: string) => field.options?.find((option) =>
    option.id === candidate || option.en === candidate || option.pl === candidate
  )?.id ?? candidate;
  return Array.isArray(value) ? value.map(normalizeOption) : normalizeOption(value);
}

export function getCreatorOptionLabel(field: WorkoutCreatorField, value: string, language: "pl" | "en") {
  return field.options?.find((option) => option.id === value || option.en === value || option.pl === value)?.[language] ?? value;
}

export type WorkoutCreatorValidationIssue = { fieldId: string; messageKey: "required" | "range" };

export function validateWorkoutCreatorDraft(draft: WorkoutCreatorDraft): WorkoutCreatorValidationIssue[] {
  const issues: WorkoutCreatorValidationIssue[] = [];
  for (const field of fieldsById.values()) {
    const value = draft[field.id];
    const empty = Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
    if (field.required && empty) {
      issues.push({ fieldId: field.id, messageKey: "required" });
      continue;
    }
    if (empty || (field.minValue === undefined && field.maxValue === undefined)) continue;
    const numeric = Number(Array.isArray(value) ? NaN : String(value).replace(",", "."));
    if (!Number.isFinite(numeric)
      || (field.minValue !== undefined && numeric < field.minValue)
      || (field.maxValue !== undefined && numeric > field.maxValue)) {
      issues.push({ fieldId: field.id, messageKey: "range" });
    }
  }
  return issues;
}

export function getDefaultCreatorCollapsedSections() {
  return Object.fromEntries(workoutCreatorSections.map((section, index) => [section.id, index !== 0]));
}

export function areCreatorValuesEqual(
  left: WorkoutCreatorValue | undefined,
  right: WorkoutCreatorValue | undefined
) {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  return (left ?? "") === (right ?? "");
}

export function areCreatorDraftsEqual(left: WorkoutCreatorDraft, right: WorkoutCreatorDraft) {
  const fieldIds = workoutCreatorSections.flatMap((section) =>
    section.fields.map((field) => field.id)
  );

  return fieldIds.every((fieldId) => areCreatorValuesEqual(left[fieldId], right[fieldId]));
}
