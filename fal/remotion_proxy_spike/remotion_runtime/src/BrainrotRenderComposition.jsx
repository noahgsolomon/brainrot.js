import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useAudioData, visualizeAudio } from "@remotion/media-utils";

import { parseSRT } from "./brainrot-helpers";
import { BrainrotSubtitles } from "./BrainrotSubtitles";

function getCurrentAmplitude({ audioData, fps, frame }) {
  if (!audioData) {
    return 0;
  }

  const frequencyData = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 32,
  });

  const amplitude =
    frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
  return amplitude * 50;
}

export function BrainrotRenderComposition({
  initialAgentName,
  videoFileName,
  musicFileName,
  audioFileName,
  subtitlesFileName,
  subtitlesLinePerPage = 6,
  subtitlesZoomMeasurerSize = 10,
  subtitlesLineHeight = 128,
  audioOffsetInSeconds = 0,
}) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const audioData = useAudioData(staticFile(audioFileName));
  const [subtitlesData, setSubtitlesData] = useState([]);
  const [currentAgentName, setCurrentAgentName] = useState(initialAgentName);

  useEffect(() => {
    let cancelled = false;

    const fetchSubtitlesData = async () => {
      const data = await Promise.all(
        subtitlesFileName.map(async ({ file }, index) => {
          const response = await fetch(staticFile(file));
          const text = await response.text();
          return parseSRT(text, index);
        }),
      );

      if (!cancelled) {
        setSubtitlesData(data.flat().sort((a, b) => a.startTime - b.startTime));
      }
    };

    void fetchSubtitlesData();

    return () => {
      cancelled = true;
    };
  }, [subtitlesFileName]);

  const currentSubtitle = useMemo(() => {
    if (subtitlesData.length === 0) {
      return null;
    }

    const currentTime = frame / fps;
    return (
      subtitlesData.find(
        (subtitle) =>
          currentTime >= subtitle.startTime && currentTime < subtitle.endTime,
      ) ?? null
    );
  }, [fps, frame, subtitlesData]);

  useEffect(() => {
    if (!currentSubtitle) {
      return;
    }

    const agentInfo = subtitlesFileName[currentSubtitle.srtFileIndex];
    if (agentInfo?.name) {
      setCurrentAgentName(agentInfo.name);
    }
  }, [currentSubtitle, subtitlesFileName]);

  const audioOffsetInFrames = Math.round(audioOffsetInSeconds * fps);
  const amplitude = getCurrentAmplitude({
    audioData,
    fps,
    frame,
  });
  const activeSide =
    currentSubtitle?.srtFileIndex === 0 || currentSubtitle?.srtFileIndex === 2
      ? "right"
      : "left";

  return (
    <AbsoluteFill style={{ fontFamily: '"ProximaNovaBlack", system-ui, sans-serif' }}>
      <Sequence from={-audioOffsetInFrames}>
        <Audio src={staticFile(audioFileName)} />
        {musicFileName ? <Audio volume={0.1} src={staticFile(musicFileName)} /> : null}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            backgroundColor: "black",
          }}
        >
          {videoFileName ? (
            <OffthreadVideo
              muted
              src={staticFile(videoFileName)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}

          <div
            style={{
              position: "absolute",
              right: 48,
              bottom: 48,
              zIndex: 30,
              color: "white",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1,
              opacity: 0.65,
              textShadow: "4px 4px 0px #000000",
              WebkitTextStroke: "2px black",
            }}
          >
            brainrotjs
            <br />
            .com
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: currentSubtitle ? -112 : -1000,
              zIndex: 30,
              display: "flex",
              justifyContent: activeSide === "right" ? "flex-end" : "flex-start",
              padding: 32,
              transition: "bottom 0.5s ease-in-out",
            }}
          >
            <Img
              src={staticFile(`pose/${activeSide}/${currentAgentName || initialAgentName}.png`)}
              width={600}
              height={600}
              style={{
                transform: `translateY(${-amplitude * 25}px)`,
                borderRadius: "999px",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              transform: "translateY(-50%)",
              zIndex: 10,
              margin: "0 96px",
              color: "white",
              fontSize: 72,
              lineHeight: `${subtitlesLineHeight}px`,
              textAlign: "center",
              textShadow: "4px 4px 0px #000000",
              WebkitTextStroke: "2px black",
            }}
          >
            <BrainrotSubtitles
              fps={fps}
              startFrame={audioOffsetInFrames}
              endFrame={audioOffsetInFrames + durationInFrames}
              linesPerPage={subtitlesLinePerPage}
              subtitlesZoomMeasurerSize={subtitlesZoomMeasurerSize}
              subtitlesLineHeight={subtitlesLineHeight}
              subtitlesData={subtitlesData}
            />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
