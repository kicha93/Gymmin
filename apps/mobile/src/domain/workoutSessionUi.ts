export function formatWorkoutElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getWorkoutProgress(current: number, total: number) {
  const safeTotal = Math.max(0, Math.floor(total));
  if (safeTotal <= 0) {
    return {
      current: 0,
      percent: 0,
      ratio: 0,
      total: 0
    };
  }

  const safeCurrent = Math.min(Math.max(0, Math.floor(current)), safeTotal);
  const ratio = safeCurrent / safeTotal;

  return {
    current: safeCurrent,
    percent: Math.round(ratio * 100),
    ratio,
    total: safeTotal
  };
}

export function formatWorkoutProgressPercent(current: number, total: number) {
  return `${getWorkoutProgress(current, total).percent}%`;
}

export function formatRestDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds <= 0) {
    return "-";
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return seconds > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
        ? `${hours}h ${minutes}m`
        : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}
