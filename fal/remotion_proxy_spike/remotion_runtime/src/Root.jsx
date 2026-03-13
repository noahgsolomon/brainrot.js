import React from "react";
import { Composition } from "remotion";

import { BlackRenderTest } from "./BlackRenderTest";

export function RemotionRoot() {
  return (
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
  );
}
