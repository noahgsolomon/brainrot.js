import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentFrame } from "remotion";

import { BrainrotWord } from "./BrainrotWord";

export function BrainrotSubtitles({
  subtitlesData,
  startFrame,
  endFrame,
  linesPerPage,
  subtitlesZoomMeasurerSize,
  subtitlesLineHeight,
  fps,
}) {
  const frame = useCurrentFrame();
  const windowRef = useRef(null);
  const zoomMeasurer = useRef(null);
  const [lineOffset, setLineOffset] = useState(0);

  const windowedFrameSubs = useMemo(
    () =>
      subtitlesData
        .map((item) => ({
          ...item,
          start: Math.floor(item.startTime * fps),
          end: Math.floor(item.endTime * fps),
        }))
        .filter(({ start }) => start >= startFrame && start <= endFrame),
    [endFrame, fps, startFrame, subtitlesData],
  );

  const currentAndFollowingSentences = useMemo(() => {
    const indexOfCurrentSentence = windowedFrameSubs.findIndex(
      (subtitle) => subtitle.end > frame,
    );

    if (indexOfCurrentSentence === -1) {
      return [];
    }

    const indexOfCurrentSentenceEnd = windowedFrameSubs.findIndex(
      (subtitle, index) =>
        index > indexOfCurrentSentence &&
        /[.?!]$/.test(subtitle.text),
    );

    return windowedFrameSubs.slice(
      indexOfCurrentSentence,
      indexOfCurrentSentenceEnd !== -1 ? indexOfCurrentSentenceEnd + 1 : undefined,
    );
  }, [frame, windowedFrameSubs]);

  const currentFrameSentences = useMemo(
    () => currentAndFollowingSentences.filter((subtitle) => subtitle.start < frame),
    [currentAndFollowingSentences, frame],
  );

  useEffect(() => {
    const zoom =
      (zoomMeasurer.current?.getBoundingClientRect().height ?? 1) /
      subtitlesZoomMeasurerSize;
    const linesRendered =
      (windowRef.current?.getBoundingClientRect().height ?? 0) /
      (subtitlesLineHeight * zoom);
    setLineOffset(Math.max(0, linesRendered - linesPerPage));
  }, [frame, linesPerPage, subtitlesLineHeight, subtitlesZoomMeasurerSize]);

  return (
    <div style={{ width: "80%", margin: "0 auto", display: "flex", justifyContent: "center" }}>
      <div
        ref={windowRef}
        style={{
          wordWrap: "break-word",
          transform: `translateY(-${lineOffset * subtitlesLineHeight}px)`,
          textAlign: "center",
        }}
      >
        {currentFrameSentences.map((item) => (
          <span key={`${item.srtFileIndex}-${item.index}`} style={{ display: "inline" }}>
            <BrainrotWord frame={frame} item={item} fps={fps} />{" "}
          </span>
        ))}
        <div
          ref={zoomMeasurer}
          style={{
            height: subtitlesZoomMeasurerSize,
            width: subtitlesZoomMeasurerSize,
          }}
        />
      </div>
    </div>
  );
}
