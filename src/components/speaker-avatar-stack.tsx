"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { getSpeakerImagePath, normalizeSpeakerNames } from "@/lib/brainrot-speakers";

export function SpeakerAvatarStack({
  speakers,
  size = 48,
  overlap = 12,
  maxVisible = 6,
  className,
}: {
  speakers: Array<string | null | undefined>;
  size?: number;
  overlap?: number;
  maxVisible?: number;
  className?: string;
}) {
  const normalized = normalizeSpeakerNames(speakers);
  const visibleSpeakers = normalized.slice(0, maxVisible);
  const remainingCount = Math.max(0, normalized.length - visibleSpeakers.length);

  if (visibleSpeakers.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {visibleSpeakers.map((speakerName, index) => (
        <div
          key={`${speakerName}-${index}`}
          className="relative overflow-hidden rounded-full border-2 border-background bg-card shadow-sm"
          style={{
            width: size,
            height: size,
            marginLeft: index === 0 ? 0 : -overlap,
            zIndex: visibleSpeakers.length - index,
          }}
        >
          <Image
            src={getSpeakerImagePath(speakerName)}
            alt={speakerName}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        </div>
      ))}
      {remainingCount > 0 ? (
        <div
          className="relative flex items-center justify-center rounded-full border-2 border-background bg-card text-xs font-semibold text-foreground shadow-sm"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            zIndex: 0,
          }}
        >
          +{remainingCount}
        </div>
      ) : null}
    </div>
  );
}
