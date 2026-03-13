import React from "react";
import { Easing, interpolate } from "remotion";

export function BrainrotWord({ item, frame, fps }) {
  const currentTimeInSeconds = frame / fps;
  const opacity = interpolate(frame, [item.start, item.start + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [item.start, item.start + 15], [0.9, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(
    frame,
    [item.start, item.start + 15],
    [5, 0],
    {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        fontSize: "6rem",
        transformOrigin: "center bottom",
      }}
    >
      {item.wordTimings?.map((wordTiming, index) => (
        <span key={`${wordTiming.word}-${index}`} style={{ marginRight: "0.25em" }}>
          <span
            style={{
              color:
                currentTimeInSeconds >= wordTiming.start &&
                currentTimeInSeconds < wordTiming.end
                  ? "#FFD700"
                  : "inherit",
            }}
          >
            {wordTiming.word}
          </span>
        </span>
      ))}
    </span>
  );
}
