import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export function BlackRenderTest({ title = "fal remotion render test" }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 18], [0, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        color: "white",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 54,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        textAlign: "center",
        padding: "0 72px",
      }}
    >
      <div style={{ opacity }}>{title}</div>
    </AbsoluteFill>
  );
}
