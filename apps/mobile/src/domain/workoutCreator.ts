import type { TextInputProps } from "react-native";

export type WorkoutCreatorPhase = "form" | "profilePrompt" | "submitted" | "waiting";
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
  maxValue?: number;
  options?: LocalizedText[];
  placeholder?: LocalizedText;
};
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

const yesNoOptions: LocalizedText[] = [
  { en: "Yes", pl: "Tak" },
  { en: "No", pl: "Nie" }
];

export const workoutCreatorSections: WorkoutCreatorSection[] = [
  {
    id: "goals",
    title: { en: "Training goals", pl: "Cele treningowe" },
    fields: [
      {
        id: "primaryGoal",
        kind: "singleChoice",
        label: { en: "What is your main training goal?", pl: "Jaki jest Twój główny cel treningowy?" },
        options: [
          { en: "Muscle gain", pl: "Budowa masy mięśniowej" },
          { en: "Fat loss", pl: "Redukcja tkanki tłuszczowej" },
          { en: "Strength increase", pl: "Zwiększenie siły" },
          { en: "Conditioning", pl: "Poprawa kondycji" },
          { en: "Health improvement", pl: "Poprawa zdrowia" },
          { en: "Body recomposition", pl: "Sylwetka „rekompozycja”" }
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
        label: { en: "How old are you?", pl: "Ile masz lat?" }
      },
      {
        id: "gender",
        kind: "singleChoice",
        label: { en: "What is your sex?", pl: "Płeć" },
        options: [
          { en: "Male", pl: "Mężczyzna" },
          { en: "Female", pl: "Kobieta" }
        ]
      },
      {
        id: "height",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "What is your height?", pl: "Jaki jest Twój wzrost?" },
        placeholder: { en: "cm", pl: "cm" }
      },
      {
        id: "bodyWeight",
        kind: "text",
        keyboardType: "decimal-pad",
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
        kind: "singleChoice",
        label: { en: "Do you have any chronic diseases?", pl: "Czy cierpisz na choroby przewlekłe?" },
        options: [
          { en: "Hypertension", pl: "Nadciśnienie" },
          { en: "Diabetes", pl: "Cukrzyca" },
          { en: "Heart disease", pl: "Choroby serca" },
          { en: "Hormonal issues", pl: "Problemy hormonalne" }
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
          { en: "Sedentary", pl: "Siedząca" },
          { en: "Physical", pl: "Fizyczna" },
          { en: "Mixed", pl: "Mieszana" }
        ]
      },
      {
        id: "sittingHours",
        kind: "text",
        keyboardType: "decimal-pad",
        label: { en: "How many hours per day do you spend sitting?", pl: "Ile godzin dziennie spędzasz siedząc?" }
      },
      {
        id: "sleepHours",
        kind: "text",
        keyboardType: "decimal-pad",
        label: { en: "How many hours do you sleep on average?", pl: "Ile średnio śpisz na dobę?" }
      },
      {
        id: "sleepQuality",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How do you rate your sleep quality on a 1-10 scale?", pl: "Jak oceniasz jakość swojego snu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "stressLevel",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "What is your stress level on a 1-10 scale?", pl: "Jak wygląda Twój poziom stresu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "dailySteps",
        kind: "text",
        keyboardType: "number-pad",
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
        label: { en: "How many days per week can you realistically train?", pl: "Ile dni w tygodniu realnie możesz trenować?" }
      },
      {
        id: "sessionDuration",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How much time can you spend on one workout in minutes?", pl: "Ile czasu możesz przeznaczyć na jeden trening w minutach?" },
        maxValue: 1000,
        placeholder: { en: "minutes", pl: "minuty" }
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
          { en: "Full body", pl: "FBW" },
          { en: "Split", pl: "Split" },
          { en: "No preference", pl: "Bez preferencji" }
        ]
      },
      {
        id: "readyWarmupSet",
        kind: "singleChoice",
        defaultValue: { en: "No", pl: "Nie" },
        label: { en: "Do you want a ready warm-up set?", pl: "Czy chcesz gotowy zestaw rozgrzewki?" },
        options: yesNoOptions
      }
    ]
  }
];

export function cloneCreatorDraft(draft: WorkoutCreatorDraft): WorkoutCreatorDraft {
  return Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])
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
      if (!key) continue;
      if (typeof rawValue === "string") {
        draftEntries.push([key, rawValue.slice(0, workoutCreatorProfileLimits.draftTextLength)]);
      } else if (Array.isArray(rawValue) && rawValue.every((item) => typeof item === "string")) {
        draftEntries.push([key, rawValue
          .slice(0, workoutCreatorProfileLimits.draftListLength)
          .map((item) => item.slice(0, workoutCreatorProfileLimits.draftListValueLength))]);
      }
    }

    seenIds.add(id);
    profiles.push({ draft: Object.fromEntries(draftEntries), id, name });
  }

  return profiles;
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
