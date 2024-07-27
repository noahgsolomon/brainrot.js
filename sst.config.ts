/// <reference path="./.sstpoop/platform/config.d.ts" />
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
      domain: {
        name: "brainrotjs.com",
        dns: sst.aws.dns({
          zone: process.env.HOSTED_ZONE_ID!,
        }),
      },
    });
  },
});
