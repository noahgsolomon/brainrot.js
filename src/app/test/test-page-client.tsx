"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/trpc/client";

function isTerminalStatus(status: string | undefined) {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toUpperCase();
  return normalizedStatus === "COMPLETED" || normalizedStatus === "ERROR";
}

export default function TestPageClient() {
  const [lastStartedVideoId, setLastStartedVideoId] = useState<string | null>(
    null,
  );
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastTerminalStatus, setLastTerminalStatus] = useState<string | null>(
    null,
  );
  const [handledTerminalPendingId, setHandledTerminalPendingId] = useState<
    number | null
  >(null);

  const videoStatusQuery = trpc.user.videoStatus.useQuery(undefined, {
    refetchInterval: (data) => (data?.videos ? 2000 : false),
  });
  const userVideosQuery = trpc.user.userVideos.useQuery();

  const deletePendingVideoMutation = trpc.user.deletePendingVideo.useMutation({
    onSuccess: () => {
      void videoStatusQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startFalWebhookTestMutation = trpc.user.startFalWebhookTest.useMutation(
    {
      onSuccess: (data) => {
        setLastStartedVideoId(data.videoId);
        setLastRequestId(data.requestId);
        setLastTerminalStatus(null);
        setHandledTerminalPendingId(null);
        toast.success("Submitted fal smoke test job.");
        void videoStatusQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message);
        void videoStatusQuery.refetch();
      },
    },
  );

  const currentPendingVideo = videoStatusQuery.data?.videos ?? null;
  const currentPendingStatus = currentPendingVideo?.status?.toUpperCase();
  const hasActivePendingJob =
    !!currentPendingVideo && !isTerminalStatus(currentPendingVideo.status);

  const matchingCompletedVideo = useMemo(() => {
    if (!userVideosQuery.data?.videos?.length) {
      return null;
    }

    return (
      userVideosQuery.data.videos.find(
        (video) => video.videoId === lastStartedVideoId,
      ) ??
      userVideosQuery.data.videos.find(
        (video) => video.title === "fal webhook smoke test",
      ) ??
      null
    );
  }, [lastStartedVideoId, userVideosQuery.data?.videos]);

  useEffect(() => {
    if (!currentPendingVideo) {
      return;
    }

    if (
      !isTerminalStatus(currentPendingVideo.status) ||
      handledTerminalPendingId === currentPendingVideo.id
    ) {
      return;
    }

    setHandledTerminalPendingId(currentPendingVideo.id);
    setLastTerminalStatus(currentPendingVideo.status.toUpperCase());

    if (currentPendingVideo.status.toUpperCase() === "COMPLETED") {
      toast.success("fal smoke test completed.");
      void userVideosQuery.refetch();
    } else {
      toast.error("fal smoke test failed.");
    }

    deletePendingVideoMutation.mutate({ id: currentPendingVideo.id });
  }, [
    currentPendingVideo,
    deletePendingVideoMutation,
    handledTerminalPendingId,
    userVideosQuery,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Run the smoke test</CardTitle>
          <CardDescription>
            The button below creates a pending job, submits the deployed fal app
            with the per-job webhook key, and then watches the existing
            `videoStatus` query update every couple seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              disabled={
                hasActivePendingJob || startFalWebhookTestMutation.isLoading
              }
              onClick={() => startFalWebhookTestMutation.mutate()}
            >
              {startFalWebhookTestMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Start fal smoke test
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={videoStatusQuery.isFetching}
              onClick={() => void videoStatusQuery.refetch()}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  videoStatusQuery.isFetching ? "animate-spin" : ""
                }`}
              />
              Refresh status
            </Button>
            {currentPendingVideo &&
            isTerminalStatus(currentPendingVideo.status) ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={deletePendingVideoMutation.isLoading}
                onClick={() =>
                  deletePendingVideoMutation.mutate({
                    id: currentPendingVideo.id,
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                Clear pending row
              </Button>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border bg-background/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Current job status
                </p>
                <p className="text-2xl font-semibold">
                  {currentPendingVideo?.status ?? "No active pending job"}
                </p>
              </div>
              {hasActivePendingJob ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : null}
            </div>

            <Progress value={currentPendingVideo?.progress ?? 0} />

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Progress</p>
                <p className="font-medium">
                  {currentPendingVideo?.progress ?? 0}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Queue position</p>
                <p className="font-medium">
                  {currentPendingVideo && currentPendingVideo.progress > 0
                    ? 0
                    : videoStatusQuery.data?.queueLength ?? 0}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Latest request id</p>
                <p className="font-mono text-xs">
                  {lastRequestId ?? "None yet"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last terminal status</p>
                <p className="font-medium">
                  {lastTerminalStatus ?? "Not finished"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to expect</CardTitle>
          <CardDescription>
            The fal worker sends staged webhook callbacks every 5 seconds, then
            writes a dummy video URL on completion so we exercise the full DB
            update path.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-xl border bg-background/80 p-4">
            <p className="font-medium">Intermediate statuses</p>
            <p className="mt-1 text-muted-foreground">
              You should see the pending row move through several fake render
              states before it reaches `COMPLETED`.
            </p>
          </div>

          <div className="rounded-xl border bg-background/80 p-4">
            <p className="font-medium">Final video row</p>
            <p className="mt-1 text-muted-foreground">
              Once the webhook sends `COMPLETED`, the app inserts a new row into
              `videos` with a sample MP4 URL.
            </p>
            {matchingCompletedVideo ? (
              <Link
                href={matchingCompletedVideo.url}
                target="_blank"
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-3 w-full gap-2",
                })}
              >
                Open completed sample video
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <div className="rounded-xl border bg-background/80 p-4">
            <p className="font-medium">Current guardrails</p>
            <p className="mt-1 text-muted-foreground">
              This only starts when there is no active pending job, and it will
              refuse to run if the webhook URL still points at localhost.
            </p>
            {currentPendingStatus ? (
              <p className="mt-2 font-medium">
                Pending row status right now: {currentPendingStatus}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
