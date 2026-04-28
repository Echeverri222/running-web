function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatPaceFromSeconds(seconds: number | null | undefined) {
  if (!seconds) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${pad(remainingSeconds)} min/km`;
}

export function formatCompactPace(seconds: number | null | undefined) {
  if (!seconds) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${pad(remainingSeconds)}`;
}

export function formatPaceRange(minSeconds: number | null | undefined, maxSeconds: number | null | undefined) {
  if (!minSeconds || !maxSeconds) {
    return null;
  }

  return `${formatCompactPace(minSeconds)}-${formatCompactPace(maxSeconds)} min/km`;
}

export function parsePaceToSeconds(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return Number.NaN;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  if (seconds >= 60) {
    return Number.NaN;
  }

  return minutes * 60 + seconds;
}
