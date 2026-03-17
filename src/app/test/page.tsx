import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

import { buttonVariants } from "@/components/ui/button";
import { HydrateClient, prefetchTRPC, trpc } from "@/trpc/server";

import TestPageClient from "./test-page-client";

export default async function TestPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-bold">fal webhook smoke test</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Sign in first so we can create a pending job, submit it to fal, and
          watch the webhook updates flow back into your existing status UI.
        </p>
        <Link href="/login" className={buttonVariants()}>
          Sign in
        </Link>
      </main>
    );
  }

  await Promise.all([
    prefetchTRPC(trpc.user.videoStatus.queryOptions()),
    prefetchTRPC(trpc.user.userVideos.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">fal webhook smoke test</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            This page creates a real pending job, submits the deployed fal
            spike, and polls the same `videoStatus` query the rest of the app
            uses.
          </p>
        </div>
        <TestPageClient />
      </main>
    </HydrateClient>
  );
}
