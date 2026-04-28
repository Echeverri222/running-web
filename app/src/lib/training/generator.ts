import { formatPaceRange } from "@/lib/format/pace";
import type { PlanGenerationInput, TrainingSession, WorkoutType } from "@/types/domain";

type PaceBand = {
  min: number;
  max: number;
};

function getBaseWeeklyKm(input: PlanGenerationInput): number {
  if (input.currentWeeklyKm > 0) {
    return input.currentWeeklyKm;
  }

  const defaults = {
    beginner: 18,
    intermediate: 28,
    advanced: 42,
  } as const;

  return defaults[input.level];
}

function getTargetMultiplier(targetDistance: PlanGenerationInput["targetDistance"]) {
  const multipliers = {
    "5K": 0.95,
    "10K": 1,
    "21K": 1.12,
    "42K": 1.22,
  } as const;

  return multipliers[targetDistance];
}

function calculateWeeklyTargetKm(input: PlanGenerationInput): number {
  const baseWeeklyKm = getBaseWeeklyKm(input);
  const growth =
    input.recentFatigueScore >= 8 ? 0.96 : input.recentFatigueScore >= 7 ? 1.0 : 1.05;
  const distanceAdjusted = baseWeeklyKm * getTargetMultiplier(input.targetDistance);
  const capped = distanceAdjusted * growth;

  if (input.weeksToRace <= 2) {
    return Math.max(12, capped * 0.7);
  }

  return Number(Math.max(12, capped).toFixed(1));
}

function estimateDurationMinutes(km: number, easyPaceSecPerKm?: number | null) {
  if (!easyPaceSecPerKm) {
    return undefined;
  }

  return Math.round((km * easyPaceSecPerKm) / 60);
}

function getQualitySessionCount(input: PlanGenerationInput) {
  if (input.availableDays <= 3) {
    return 1;
  }

  if (
    input.recentQualitySessionsPerWeek &&
    input.recentQualitySessionsPerWeek >= 1.5 &&
    input.recentFatigueScore <= 6
  ) {
    return 2;
  }

  return 1;
}

function getAnchorPace(input: PlanGenerationInput) {
  if (input.easyPaceSecPerKm) {
    return input.easyPaceSecPerKm;
  }

  const defaults = {
    beginner: 395,
    intermediate: 335,
    advanced: 285,
  } as const;

  return defaults[input.level];
}

function getPaceBands(input: PlanGenerationInput) {
  const easy = getAnchorPace(input);

  const easyBand: PaceBand = { min: easy - 10, max: easy + 10 };
  const recoveryBand: PaceBand = { min: easy + 15, max: easy + 35 };
  const longBand: PaceBand = { min: easy + 5, max: easy + 20 };

  const tempoOffsets = {
    "5K": [-45, -30],
    "10K": [-35, -20],
    "21K": [-28, -15],
    "42K": [-20, -10],
  } as const;
  const intervalOffsets = {
    "5K": [-65, -45],
    "10K": [-55, -35],
    "21K": [-45, -28],
    "42K": [-35, -20],
  } as const;
  const fartlekOffsets = {
    "5K": [-55, -35],
    "10K": [-45, -28],
    "21K": [-35, -20],
    "42K": [-28, -15],
  } as const;

  const [tempoMinOffset, tempoMaxOffset] = tempoOffsets[input.targetDistance];
  const [intervalMinOffset, intervalMaxOffset] = intervalOffsets[input.targetDistance];
  const [fartlekMinOffset, fartlekMaxOffset] = fartlekOffsets[input.targetDistance];

  return {
    easy: easyBand,
    recovery: recoveryBand,
    long: longBand,
    tempo: { min: easy + tempoMinOffset, max: easy + tempoMaxOffset },
    intervals: { min: easy + intervalMinOffset, max: easy + intervalMaxOffset },
    fartlekFast: { min: easy + fartlekMinOffset, max: easy + fartlekMaxOffset },
    float: { min: easy - 5, max: easy + 10 },
  };
}

function buildEasyNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: rodaje aerobico controlado de ${plannedKm} km.`,
    `Bloques:`,
    `- 10 min calentamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `- ${Math.max(20, Math.round((plannedKm * 0.7 * getAnchorPace(input)) / 60))} min bloque principal a ${formatPaceRange(paces.easy.min, paces.easy.max)}.`,
    `- 5-10 min enfriamiento muy suave a ${formatPaceRange(paces.recovery.min, paces.recovery.max)}.`,
  ].join("\n");
}

function buildRecoveryNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: recuperar piernas y bajar carga acumulada en ${plannedKm} km.`,
    `Bloques:`,
    `- Todo el rodaje a ${formatPaceRange(paces.recovery.min, paces.recovery.max)}.`,
    `- Mantener respiracion facil y tecnica relajada todo el tiempo.`,
  ].join("\n");
}

function buildTempoNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: trabajo de umbral para sostener ritmo en carrera.`,
    `Bloques:`,
    `- 15 min calentamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `- 3 x 8 min a ${formatPaceRange(paces.tempo.min, paces.tempo.max)} con 2 min trote a ${formatPaceRange(paces.recovery.min, paces.recovery.max)}.`,
    `- 10 min enfriamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `Volumen estimado: ${plannedKm} km.`,
  ].join("\n");
}

function buildFartlekNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: variar ritmos sin perder fluidez.`,
    `Bloques:`,
    `- 12 min calentamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `- 8 x 2 min rapido a ${formatPaceRange(paces.fartlekFast.min, paces.fartlekFast.max)} + 2 min flotando a ${formatPaceRange(paces.float.min, paces.float.max)}.`,
    `- 10 min enfriamiento suave a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `Volumen estimado: ${plannedKm} km.`,
  ].join("\n");
}

function buildIntervalNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: estimular velocidad especifica y economia de carrera.`,
    `Bloques:`,
    `- 15 min calentamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `- 6 x 800 m a ${formatPaceRange(paces.intervals.min, paces.intervals.max)} con 400 m trote a ${formatPaceRange(paces.recovery.min, paces.recovery.max)}.`,
    `- 10 min enfriamiento a ${formatPaceRange(paces.recovery.min, paces.easy.max)}.`,
    `Volumen estimado: ${plannedKm} km.`,
  ].join("\n");
}

function buildLongRunNotes(input: PlanGenerationInput, plannedKm: number) {
  const paces = getPaceBands(input);
  return [
    `Objetivo: desarrollar resistencia para la distancia objetivo.`,
    `Bloques:`,
    `- Primer 70% a ${formatPaceRange(paces.long.min, paces.long.max)}.`,
    `- Ultimo 20% progresando hacia ${formatPaceRange(paces.easy.min, paces.easy.max)}.`,
    `- Ultimo 10% soltando y controlando respiracion.`,
    `Volumen estimado: ${plannedKm} km.`,
  ].join("\n");
}

function buildSessionNotes(type: WorkoutType, input: PlanGenerationInput, plannedKm: number) {
  switch (type) {
    case "recovery":
      return buildRecoveryNotes(input, plannedKm);
    case "tempo":
      return buildTempoNotes(input, plannedKm);
    case "fartlek":
      return buildFartlekNotes(input, plannedKm);
    case "intervals":
      return buildIntervalNotes(input, plannedKm);
    case "long":
      return buildLongRunNotes(input, plannedKm);
    default:
      return buildEasyNotes(input, plannedKm);
  }
}

function getPrimaryQualityType(input: PlanGenerationInput): WorkoutType {
  if (input.targetDistance === "42K") {
    return "tempo";
  }

  if (input.targetDistance === "21K") {
    return input.recentFatigueScore <= 6 ? "tempo" : "fartlek";
  }

  return input.recentFatigueScore <= 6 ? "intervals" : "fartlek";
}

function getSecondaryQualityType(input: PlanGenerationInput): WorkoutType {
  if (input.targetDistance === "42K") {
    return "fartlek";
  }

  return "tempo";
}

function createSession(
  dayOfWeek: number,
  type: WorkoutType,
  plannedKm: number,
  input: PlanGenerationInput,
): TrainingSession {
  return {
    dayOfWeek,
    type,
    plannedKm,
    plannedDurationMin: estimateDurationMinutes(plannedKm, input.easyPaceSecPerKm),
    notes: buildSessionNotes(type, input, plannedKm),
  };
}

function getUniqueWeekdaySlots(sessionCount: number): number[] {
  if (sessionCount >= 5) {
    return [1, 2, 4, 6, 7];
  }

  if (sessionCount === 4) {
    return [1, 3, 5, 7];
  }

  return [2, 4, 7];
}

export function generateWeekPlan(input: PlanGenerationInput): TrainingSession[] {
  const targetKm = calculateWeeklyTargetKm(input);
  const recentLongestRunKm = input.recentLongestRunKm ?? 0;
  const longRunFloor =
    recentLongestRunKm > 0 ? Math.max(recentLongestRunKm * 0.9, targetKm * 0.25) : targetKm * 0.25;
  const longRunCeiling = recentLongestRunKm > 0 ? recentLongestRunKm * 1.08 : targetKm * 0.34;
  const longRunKm = Number(
    Math.min(longRunCeiling, Math.max(longRunFloor, targetKm * 0.3)).toFixed(1),
  );
  const qualitySessionCount = getQualitySessionCount(input);
  const supportRunCount = Math.max(1, input.availableDays - qualitySessionCount - 1);
  const remainingKm = Math.max(4, targetKm - longRunKm);
  const supportRunKm = Number((remainingKm / supportRunCount).toFixed(1));
  const sessionTemplates: Array<Pick<TrainingSession, "type" | "plannedKm">> = [
    { type: "easy", plannedKm: supportRunKm },
    { type: getPrimaryQualityType(input), plannedKm: supportRunKm },
  ];

  if (qualitySessionCount === 2) {
    sessionTemplates.push({
      type: getSecondaryQualityType(input),
      plannedKm: Math.max(5, supportRunKm - 1),
    });
  }

  if (input.availableDays >= 5) {
    sessionTemplates.push({
      type: "recovery",
      plannedKm: Math.max(4, supportRunKm - 2),
    });
  } else if (input.availableDays >= 4) {
    sessionTemplates.push({ type: "easy", plannedKm: supportRunKm });
  }

  sessionTemplates.push({ type: "long", plannedKm: longRunKm });

  const weekdaySlots = getUniqueWeekdaySlots(sessionTemplates.length);

  return sessionTemplates
    .map((session, index) =>
      createSession(weekdaySlots[index] ?? weekdaySlots[weekdaySlots.length - 1] ?? 7, session.type, session.plannedKm, input),
    )
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}
