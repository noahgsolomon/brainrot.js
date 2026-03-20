export const BRAINROT_SPEAKER_IDS = [
  "JORDAN_PETERSON",
  "BEN_SHAPIRO",
  "JOE_ROGAN",
  "BARACK_OBAMA",
  "DONALD_TRUMP",
  "JOE_BIDEN",
  "ANDREW_TATE",
  "KAMALA_HARRIS",
] as const;

export const MIN_BRAINROT_SPEAKERS = 2;
export const MAX_BRAINROT_SPEAKERS = 8;

export type BrainrotSpeakerId = (typeof BRAINROT_SPEAKER_IDS)[number];

export function normalizeSpeakerNames(
  speakers: Array<string | null | undefined>,
): string[] {
  const deduped = new Set<string>();

  for (const speaker of speakers) {
    if (typeof speaker !== "string") {
      continue;
    }

    const trimmed = speaker.trim();
    if (!trimmed) {
      continue;
    }

    deduped.add(trimmed);
  }

  return [...deduped];
}

export function parseSpeakerNames(value: string | null | undefined): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeSpeakerNames(
          parsed.map((speaker) =>
            typeof speaker === "string" ? speaker : String(speaker ?? ""),
          ),
        );
      }
    } catch {
      // Fall back to comma-separated parsing below.
    }
  }

  return normalizeSpeakerNames(trimmed.split(","));
}

export function serializeSpeakerNamesForStorage(
  speakers: Array<string | null | undefined>,
): string | null {
  const normalized = normalizeSpeakerNames(speakers);
  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

export function serializeSpeakerNamesForQueryParam(
  speakers: Array<string | null | undefined>,
): string | undefined {
  const normalized = normalizeSpeakerNames(speakers);
  return normalized.length > 0 ? normalized.join(",") : undefined;
}

export function resolveSpeakerNames(
  serializedSpeakers: string | null | undefined,
  fallbackSpeakers: Array<string | null | undefined> = [],
): string[] {
  const parsed = parseSpeakerNames(serializedSpeakers);
  return parsed.length > 0 ? parsed : normalizeSpeakerNames(fallbackSpeakers);
}

export function humanizeSpeakerName(speakerName: string): string {
  return speakerName
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatSpeakerNames(
  speakers: Array<string | null | undefined>,
  conjunction = "and",
): string {
  const normalized = normalizeSpeakerNames(speakers).map(humanizeSpeakerName);

  if (normalized.length === 0) {
    return "";
  }

  if (normalized.length === 1) {
    return normalized[0] ?? "";
  }

  if (normalized.length === 2) {
    return `${normalized[0]} ${conjunction} ${normalized[1]}`;
  }

  return `${normalized.slice(0, -1).join(", ")}, ${conjunction} ${normalized.at(-1)}`;
}

export function getSpeakerImagePath(speakerName: string): string {
  return `/img/${speakerName}.png`;
}

