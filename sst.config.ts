/// <reference path="./.sst/platform/config.d.ts" />
import { NextEnv } from "./sst.env";

export default $config({
  app(input) {
    return {
      name: "brainrotjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("BrainrotjsWeb", {
      environment: {
        ...NextEnv,
      },
      buildCommand:
        "npx --yes open-next@3.0.8 build --build-mode=experimental-compile",
      domain: {
        name: "brainrotjs.com",
        dns: sst.aws.dns({
          zone: process.env.HOSTED_ZONE_ID!,
        }),
      },
    });
  },
});
