import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, TextInput, Vibration, View } from "react-native";
import type { TextInputProps } from "react-native";

import { formatWorkoutElapsedTime } from "../domain/workoutSessionUi";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

function formatTimerSecondsValue(totalSeconds: number) {
  return formatWorkoutElapsedTime(totalSeconds);
}

export function parseTimerSecondsValue(value?: string) {
  if (!value?.trim()) {
    return 0;
  }

  const trimmed = value.trim().toLowerCase();
  const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (hmsMatch) {
    const first = Number.parseInt(hmsMatch[1], 10);
    const second = Number.parseInt(hmsMatch[2], 10);
    const third = hmsMatch[3] ? Number.parseInt(hmsMatch[3], 10) : 0;
    if ([first, second, third].every(Number.isFinite)) {
      return hmsMatch[3] ? first * 3600 + second * 60 + third : first * 60 + second;
    }
  }

  const minutesMatch = trimmed.match(/(\d+)\s*m/);
  const secondsMatch = trimmed.match(/(\d+)\s*s/);
  const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? Number.parseInt(secondsMatch[1], 10) : 0;
  if (minutes || seconds) {
    return minutes * 60 + seconds;
  }

  const numeric = Number.parseInt(trimmed, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function vibrateWorkoutTimerComplete() {
  if (Platform.OS === "web") {
    return;
  }

  Vibration.vibrate([0, 350, 120, 350]);
}

export function WorkoutHeaderElapsedTime({ startedAt, theme }: { startedAt: string; theme: Theme }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setNow(Date.now());
      }
    });

    return () => subscription.remove();
  }, []);

  const startedAtMs = Date.parse(startedAt);
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((now - startedAtMs) / 1000))
    : 0;

  return (
    <View style={styles.headerElapsedTimeRow}>
      <Ionicons name="time-outline" size={17} color={theme.primary} />
      <Text style={[styles.headerElapsedTime, { color: theme.primary }]} numberOfLines={1}>
        {formatWorkoutElapsedTime(elapsedSeconds)}
      </Text>
    </View>
  );
}

type SessionValueInputProps = {
  keyboardType: TextInputProps["keyboardType"];
  onChangeText: (value: string) => void;
  placeholder: string;
  suffix?: string;
  theme: Theme;
  value?: string;
};

export function SessionValueInput({ keyboardType, onChangeText, placeholder, suffix, theme, value }: SessionValueInputProps) {
  const [localValue, setLocalValue] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && (value ?? "") !== localValue) {
      setLocalValue(value ?? "");
    }
  }, [isFocused, localValue, value]);

  return (
    <View style={[styles.suffixedInput, { backgroundColor: theme.control, borderColor: theme.border }]}>
      <TextInput
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[styles.suffixedTextInput, { color: theme.inputText }]}
        value={localValue}
        onBlur={() => {
          setIsFocused(false);
          if ((value ?? "") !== localValue) {
            onChangeText(localValue);
          }
        }}
        onChangeText={(nextValue) => {
          setLocalValue(nextValue);
          onChangeText(nextValue);
        }}
        onFocus={() => setIsFocused(true)}
      />
      {suffix ? <Text style={[styles.inputSuffix, { color: theme.muted }]}>{suffix}</Text> : null}
    </View>
  );
}

type RestTimerControlProps = {
  labels: {
    pause: string;
    reset: string;
    restTimer: string;
    start: string;
  };
  plannedSeconds: number;
  theme: Theme;
};

export function RestTimerControl({ labels, plannedSeconds, theme }: RestTimerControlProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(plannedSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [endsAtMs, setEndsAtMs] = useState<number | null>(null);
  const hasVibratedRef = useRef(false);

  useEffect(() => {
    setRemainingSeconds(plannedSeconds);
    setIsRunning(false);
    setEndsAtMs(null);
    hasVibratedRef.current = false;
  }, [plannedSeconds]);

  useEffect(() => {
    if (!isRunning || !endsAtMs) {
      return undefined;
    }

    const updateRemaining = () => {
      const nextRemaining = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        setIsRunning(false);
        setEndsAtMs(null);
        if (!hasVibratedRef.current) {
          hasVibratedRef.current = true;
          vibrateWorkoutTimerComplete();
        }
      }
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 500);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        updateRemaining();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [endsAtMs, isRunning]);

  useEffect(() => {
    if (remainingSeconds <= 0 && isRunning) {
      setIsRunning(false);
    }
  }, [isRunning, remainingSeconds]);

  return (
    <View style={[styles.restTimerCard, { backgroundColor: theme.control, borderColor: theme.border }]}>
      <View style={styles.restTimerCopy}>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{labels.restTimer}</Text>
        <Text style={[styles.restTimerValue, { color: theme.primary }]}>{formatTimerSecondsValue(remainingSeconds)}</Text>
      </View>
      <View style={styles.restTimerActions}>
        <Pressable
          accessibilityRole="button"
          style={[styles.restTimerButton, { borderColor: theme.border }]}
          onPress={() => {
            if (isRunning) {
              setRemainingSeconds(Math.max(0, Math.ceil(((endsAtMs ?? Date.now()) - Date.now()) / 1000)));
              setEndsAtMs(null);
              setIsRunning(false);
              return;
            }

            const secondsToRun = remainingSeconds <= 0 ? plannedSeconds : remainingSeconds;
            if (remainingSeconds <= 0) {
              setRemainingSeconds(plannedSeconds);
            }
            hasVibratedRef.current = false;
            setEndsAtMs(Date.now() + secondsToRun * 1000);
            setIsRunning(true);
          }}
        >
          <Text style={[styles.restTimerButtonText, { color: theme.primary }]}>
            {isRunning ? labels.pause : labels.start}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.restTimerButton, { borderColor: theme.border }]}
          onPress={() => {
            setRemainingSeconds(plannedSeconds);
            setIsRunning(false);
            setEndsAtMs(null);
            hasVibratedRef.current = false;
          }}
        >
          <Text style={[styles.restTimerButtonText, { color: theme.primary }]}>{labels.reset}</Text>
        </Pressable>
      </View>
    </View>
  );
}
