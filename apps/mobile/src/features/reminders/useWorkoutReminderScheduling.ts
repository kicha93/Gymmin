import { useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../../i18n/translations";
import type { ReminderSchedulingStatus } from "../../domain/settings";
import {
  getDefaultWorkoutReminderSettings,
  rescheduleWorkoutReminders,
  type WorkoutReminderSettings
} from "../../domain/workoutReminders";
import type { WorkoutSession } from "../../domain/workoutSessions";

type UseWorkoutReminderSchedulingOptions = {
  enabled: boolean;
  language: LanguageCode;
  sessions: WorkoutSession[];
  settings: WorkoutReminderSettings;
  updateSettings: (settings: WorkoutReminderSettings) => void;
};

export function useWorkoutReminderScheduling(options: UseWorkoutReminderSchedulingOptions) {
  const [status, setStatus] = useState<ReminderSchedulingStatus>("idle");
  const previousLanguageRef = useRef(options.language);

  useEffect(() => {
    const previousLanguage = previousLanguageRef.current;
    if (previousLanguage === options.language) {
      return;
    }
    previousLanguageRef.current = options.language;

    const previousDefaults = getDefaultWorkoutReminderSettings(previousLanguage);
    const nextDefaults = getDefaultWorkoutReminderSettings(options.language);
    const shouldUpdateMessage = options.settings.message === previousDefaults.message;
    const shouldUpdateDescription = (options.settings.description ?? "") === (previousDefaults.description ?? "");
    if (shouldUpdateMessage || shouldUpdateDescription) {
      options.updateSettings({
        ...options.settings,
        description: shouldUpdateDescription ? nextDefaults.description : options.settings.description,
        message: shouldUpdateMessage ? nextDefaults.message : options.settings.message
      });
    }
  }, [options.language, options.settings]);

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    let isActive = true;
    rescheduleWorkoutReminders(options.settings, options.sessions)
      .then((result) => {
        if (!isActive) {
          return;
        }
        setStatus(result.permissionDenied
          ? "permissionDenied"
          : options.settings.enabled ? "scheduled" : "idle");
      })
      .catch((error) => {
        console.error("Failed to reschedule workout reminders", error);
        if (isActive) {
          setStatus("failed");
        }
      });

    return () => {
      isActive = false;
    };
  }, [options.enabled, options.sessions, options.settings]);

  return { setStatus, status };
}
