import "server-only";

export interface TimingPhase {
  key: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface TimingState {
  createdAt: string;
  updatedAt: string;
  currentPhaseKey: string | null;
  phases: TimingPhase[];
}

interface TimingSample {
  totalDurationMs: number;
  queueDurationMs: number;
  phaseTimings: string;
}

const QUEUE_STARTUP_BUFFER_MS = 15_000;

export function normalizePhaseKey(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cloneTimingState(state: TimingState): TimingState {
  return {
    ...state,
    phases: state.phases.map((phase) => ({ ...phase })),
  };
}

function durationBetween(startedAt: string, completedAt: Date) {
  return Math.max(completedAt.getTime() - new Date(startedAt).getTime(), 0);
}

function finalizeOpenPhase(phase: TimingPhase, completedAt: Date) {
  if (phase.completedAt) {
    return;
  }

  phase.completedAt = completedAt.toISOString();
  phase.durationMs = durationBetween(phase.startedAt, completedAt);
}

export function createInitialTimingState(createdAt: Date, status = "Waiting in Queue") {
  const createdAtIso = createdAt.toISOString();

  return {
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
    currentPhaseKey: "queued",
    phases: [
      {
        key: "queued",
        status,
        progress: 0,
        startedAt: createdAtIso,
      },
    ],
  } satisfies TimingState;
}

export function parseTimingState(raw: string | null | undefined, createdAt: Date) {
  if (!raw) {
    return createInitialTimingState(createdAt);
  }

  try {
    const parsed = JSON.parse(raw) as TimingState;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.phases) ||
      typeof parsed.createdAt !== "string"
    ) {
      return createInitialTimingState(createdAt);
    }

    return {
      createdAt: parsed.createdAt,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : parsed.createdAt,
      currentPhaseKey:
        typeof parsed.currentPhaseKey === "string" ? parsed.currentPhaseKey : null,
      phases: parsed.phases
        .filter(
          (phase): phase is TimingPhase =>
            !!phase &&
            typeof phase.key === "string" &&
            typeof phase.status === "string" &&
            typeof phase.progress === "number" &&
            typeof phase.startedAt === "string",
        )
        .map((phase) => ({ ...phase })),
    };
  } catch {
    return createInitialTimingState(createdAt);
  }
}

export function serializeTimingState(state: TimingState) {
  return JSON.stringify(state);
}

export function applyTimingProgressUpdate(input: {
  existingTimingState: string | null | undefined;
  createdAt: Date;
  now: Date;
  status: string;
  progress: number;
  phaseKey?: string | null;
}) {
  const state = cloneTimingState(
    parseTimingState(input.existingTimingState, input.createdAt),
  );
  const nowIso = input.now.toISOString();
  const nextPhaseKey =
    input.phaseKey?.trim() || normalizePhaseKey(input.status) || "unknown";
  const activePhase = state.phases.find(
    (phase) =>
      phase.key === state.currentPhaseKey && phase.completedAt === undefined,
  );

  if (!activePhase || activePhase.key !== nextPhaseKey) {
    if (activePhase) {
      finalizeOpenPhase(activePhase, input.now);
    }

    state.phases.push({
      key: nextPhaseKey,
      status: input.status,
      progress: input.progress,
      startedAt: nowIso,
    });
    state.currentPhaseKey = nextPhaseKey;
  } else {
    activePhase.status = input.status;
    activePhase.progress = input.progress;
  }

  state.updatedAt = nowIso;

  return {
    phaseKey: nextPhaseKey,
    phaseStartedAt: new Date(
      state.phases[state.phases.length - 1]?.startedAt ?? nowIso,
    ),
    timingState: state,
  };
}

export function finalizeTimingState(
  existingTimingState: string | null | undefined,
  createdAt: Date,
  completedAt: Date,
) {
  const state = cloneTimingState(parseTimingState(existingTimingState, createdAt));
  const activePhase = state.phases.find(
    (phase) =>
      phase.key === state.currentPhaseKey && phase.completedAt === undefined,
  );

  if (activePhase) {
    finalizeOpenPhase(activePhase, completedAt);
  }

  state.updatedAt = completedAt.toISOString();
  state.currentPhaseKey = null;
  return state;
}

function parsePhaseTimings(raw: string): TimingPhase[] {
  try {
    const parsed = JSON.parse(raw) as TimingPhase[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (phase): phase is TimingPhase =>
        !!phase &&
        typeof phase.key === "string" &&
        typeof phase.startedAt === "string" &&
        typeof phase.durationMs === "number",
    );
  } catch {
    return [];
  }
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTimingSample(input: {
  existingTimingState: string | null | undefined;
  createdAt: Date;
  completedAt: Date;
}) {
  const finalizedState = finalizeTimingState(
    input.existingTimingState,
    input.createdAt,
    input.completedAt,
  );
  const phaseTimings = finalizedState.phases
    .filter((phase) => typeof phase.durationMs === "number")
    .map((phase) => ({ ...phase, durationMs: phase.durationMs ?? 0 }));
  const totalDurationMs = Math.max(
    input.completedAt.getTime() - input.createdAt.getTime(),
    0,
  );
  const queueDurationMs =
    phaseTimings.find((phase) => phase.key === "queued")?.durationMs ?? 0;

  return {
    finalizedState,
    totalDurationMs,
    queueDurationMs,
    phaseTimings,
  };
}

export function estimateRemainingTime(input: {
  samples: TimingSample[];
  createdAt: Date;
  queueLength: number;
  currentPhaseKey?: string | null;
  phaseStartedAt?: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const avgTotalMs = average(
    input.samples
      .map((sample) => sample.totalDurationMs)
      .filter((duration) => duration > 0),
  );

  if (avgTotalMs === null) {
    return {
      estimatedMsRemaining: null,
      estimatedMsTotal: null,
      confidence: "none" as const,
      sampleSize: 0,
    };
  }

  const elapsedTotalMs = Math.max(now.getTime() - input.createdAt.getTime(), 0);
  let estimatedMsRemaining: number | null = null;
  let confidence: "low" | "medium" | "high" = "low";

  if (input.currentPhaseKey && input.phaseStartedAt) {
    const elapsedCurrentPhaseMs = Math.max(
      now.getTime() - input.phaseStartedAt.getTime(),
      0,
    );
    const phaseRemainingSamples = input.samples
      .map((sample) => {
        const phases = parsePhaseTimings(sample.phaseTimings);
        const currentIndex = phases.findIndex(
          (phase) => phase.key === input.currentPhaseKey,
        );

        if (currentIndex === -1) {
          return null;
        }

        const currentPhase = phases[currentIndex]!;
        const currentPhaseRemainingMs = Math.max(
          (currentPhase.durationMs ?? 0) - elapsedCurrentPhaseMs,
          0,
        );
        const futurePhaseMs = phases
          .slice(currentIndex + 1)
          .reduce((sum, phase) => sum + (phase.durationMs ?? 0), 0);

        return currentPhaseRemainingMs + futurePhaseMs;
      })
      .filter((value): value is number => value !== null);

    const avgPhaseRemainingMs = average(phaseRemainingSamples);
    if (avgPhaseRemainingMs !== null) {
      estimatedMsRemaining = avgPhaseRemainingMs;
      confidence =
        phaseRemainingSamples.length >= 12
          ? "high"
          : phaseRemainingSamples.length >= 5
            ? "medium"
            : "low";
    }
  }

  if (estimatedMsRemaining === null) {
    estimatedMsRemaining = Math.max(
      avgTotalMs * Math.max(input.queueLength, 0) + avgTotalMs - elapsedTotalMs,
      0,
    );
    confidence =
      input.samples.length >= 12
        ? "high"
        : input.samples.length >= 5
          ? "medium"
          : "low";
  }

  if (input.currentPhaseKey === "queued") {
    estimatedMsRemaining += QUEUE_STARTUP_BUFFER_MS;
  }

  return {
    estimatedMsRemaining,
    estimatedMsTotal: Math.max(elapsedTotalMs + estimatedMsRemaining, avgTotalMs),
    confidence,
    sampleSize: input.samples.length,
  };
}
