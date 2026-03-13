import React from "react";
import { Composition } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";
import { staticFile } from "remotion";

import { BrainrotRenderComposition } from "./BrainrotRenderComposition";
import { BlackRenderTest } from "./BlackRenderTest";
import "./style.css";

export function RemotionRoot() {
  const compositionFps = 30;
  const compositionWidth = 720;
  const compositionHeight = 1280;

  return (
    <>
      <Composition
        id="BlackRenderTest"
        component={BlackRenderTest}
        durationInFrames={45}
        fps={30}
        width={720}
        height={1280}
        defaultProps={{
          title: "fal remotion render test",
        }}
      />
      <Composition
        id="BrainrotRenderTest"
        component={BrainrotRenderComposition}
        fps={compositionFps}
        width={compositionWidth}
        height={compositionHeight}
        durationInFrames={3600}
        defaultProps={{
          initialAgentName: "JOE_ROGAN",
          videoFileName: "background/MINECRAFT-0.mp4",
          musicFileName: "music/WII_SHOP_CHANNEL_TRAP.MP3",
          audioFileName: "jobs/example/audio.mp3",
          subtitlesFileName: [
            {
              name: "JOE_ROGAN",
              file: "jobs/example/srt/JOE_ROGAN-0.srt",
            },
          ],
          subtitlesLinePerPage: 6,
          subtitlesZoomMeasurerSize: 10,
          subtitlesLineHeight: 128,
          audioOffsetInSeconds: 0,
        }}
        calculateMetadata={async ({ props }) => {
          const durationInSeconds =
            (await getAudioDuration(staticFile(props.audioFileName))) + 0.5;
          return {
            durationInFrames: Math.ceil(durationInSeconds * compositionFps),
            props,
          };
        }}
      />
    </>
  );
}
