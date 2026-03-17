/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "brainrotjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const { NextEnv } = await import("./sst.env");

    new sst.aws.Nextjs("BrainrotjsWeb", {
      environment: {
        ...NextEnv,
      },
      buildCommand:
        "npx --yes @opennextjs/aws@3.9.16 build --build-mode=experimental-compile",
      domain: {
        name: "brainrotjs.com",
        dns: sst.aws.dns({
          zone: process.env.HOSTED_ZONE_ID!,
        }),
      },
    });
  },
});
