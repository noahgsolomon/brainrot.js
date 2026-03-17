"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { useTRPC } from "@/trpc/client";
import { formatEtaSeconds, useLiveEta } from "@/lib/use-live-eta";

function isTerminalStatus(status: string | undefined) {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toUpperCase();
  return normalizedStatus === "COMPLETED" || normalizedStatus === "ERROR";
}

export default function TestPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [lastStartedVideoId, setLastStartedVideoId] = useState<string | null>(
    null,
  );
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [openRouterRequestId, setOpenRouterRequestId] = useState<string | null>(
    null,
  );
  const [openRouterModel, setOpenRouterModel] = useState<string | null>(null);
  const [openRouterOutput, setOpenRouterOutput] = useState<string | null>(null);
  const [openRouterEndpoint, setOpenRouterEndpoint] = useState<string | null>(
    null,
  );
  const [openRouterUsage, setOpenRouterUsage] = useState<{
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null>(null);
  const [lastTerminalStatus, setLastTerminalStatus] = useState<string | null>(
    null,
  );
  const [handledTerminalPendingId, setHandledTerminalPendingId] = useState<
    number | null
  >(null);

  const videoStatusQuery = useQuery(
    trpc.user.videoStatus.queryOptions(undefined, {
      refetchInterval: (query) => {
        const data = query.state.data as
          | { videos: Array<{ status: string }> }
          | undefined;

        return data?.videos?.some((video) => !isTerminalStatus(video.status))
          ? 2000
          : false;
      },
      refetchOnWindowFocus: false,
    }),
  );
  const userVideosQuery = useQuery(trpc.user.userVideos.queryOptions());

  const deletePendingVideoMutation = useMutation(
    trpc.user.deletePendingVideo.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter()),
          queryClient.invalidateQueries(
            trpc.user.activeQueueCount.queryFilter(),
          ),
        ]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const startFalWebhookTestMutation = useMutation(
    trpc.user.startFalWebhookTest.mutationOptions({
      onSuccess: (data) => {
        setLastStartedVideoId(data.videoId);
        setLastRequestId(data.requestId);
        setLastTerminalStatus(null);
        setHandledTerminalPendingId(null);
        toast.success("Submitted fal smoke test job.");
        void queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message);
        void queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter());
      },
    }),
  );
  const startFalBrainrotRenderTestMutation = useMutation(
    trpc.user.startFalBrainrotRenderTest.mutationOptions({
      onSuccess: (data) => {
        setLastStartedVideoId(data.videoId);
        setLastRequestId(data.requestId);
        setLastTerminalStatus(null);
        setHandledTerminalPendingId(null);
        toast.success("Submitted fal brainrot render test.");
        void queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message);
        void queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter());
      },
    }),
  );
  const testFalOpenRouterCompatibilityMutation = useMutation(
    trpc.user.testFalOpenRouterCompatibility.mutationOptions({
      onSuccess: (data) => {
        setOpenRouterRequestId(data.requestId);
        setOpenRouterModel(data.model);
        setOpenRouterOutput(data.output);
        setOpenRouterEndpoint(data.endpoint);
        setOpenRouterUsage(data.usage);
        toast.success("fal OpenAI-compatible endpoint responded.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const currentPendingVideo = videoStatusQuery.data?.videos?.[0] ?? null;
  const currentPendingStatus = currentPendingVideo?.status?.toUpperCase();
  const hasActivePendingJob =
    !!currentPendingVideo && !isTerminalStatus(currentPendingVideo.status);
  const liveEstimatedMsRemaining = useLiveEta(
    currentPendingVideo?.estimatedMsRemaining,
    hasActivePendingJob,
  );

  const matchingCompletedVideo = useMemo(() => {
    if (!userVideosQuery.data?.videos?.length) {
      return null;
    }

    return (
      userVideosQuery.data.videos.find(
        (video) => video.videoId === lastStartedVideoId,
      ) ??
      userVideosQuery.data.videos.find(
        (video) => video.title === "fal brainrot render test",
      ) ??
      userVideosQuery.data.videos.find(
        (video) => video.title === "fal remotion render test",
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
      toast.success("fal test job completed.");
      void queryClient.invalidateQueries(trpc.user.userVideos.queryFilter());
    } else {
      toast.error("fal test job failed.");
    }

    deletePendingVideoMutation.mutate({ id: currentPendingVideo.id });
  }, [
    currentPendingVideo,
    deletePendingVideoMutation,
    handledTerminalPendingId,
    queryClient,
    trpc.user.userVideos,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Run the smoke test</CardTitle>
            <CardDescription>
              The button below creates a pending job, submits the deployed fal
              app with the per-job webhook key, and then watches the existing
              `videoStatus` query update every couple seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button
                className="gap-2"
                disabled={
                  hasActivePendingJob || startFalWebhookTestMutation.isPending
                }
                onClick={() => startFalWebhookTestMutation.mutate()}
              >
                {startFalWebhookTestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Start fal smoke test
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                disabled={
                  hasActivePendingJob ||
                  startFalBrainrotRenderTestMutation.isPending
                }
                onClick={() => startFalBrainrotRenderTestMutation.mutate()}
              >
                {startFalBrainrotRenderTestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Start fal brainrot render
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
                  disabled={deletePendingVideoMutation.isPending}
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
                      : currentPendingVideo?.queueLength ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. time remaining</p>
                  <p className="font-medium">
                    {formatEtaSeconds(liveEstimatedMsRemaining) ?? "Calculating..."}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ETA confidence</p>
                  <p className="font-medium">
                    {currentPendingVideo?.etaConfidence ?? "none"} (
                    {currentPendingVideo?.etaSampleSize ?? 0} samples)
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
            <CardTitle>Run a real Remotion render</CardTitle>
            <CardDescription>
              This queues a short actual Remotion render on fal, uploads the
              resulting MP4 through fal&apos;s file helper, and completes through
              the same webhook flow the app already uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Check OpenAI compatibility</CardTitle>
            <CardDescription>
              This hits fal&apos;s OpenAI-style `chat/completions` endpoint from
              the web app server with your `FAL_KEY` and returns a tiny mock
              transcript.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button
                className="gap-2"
                disabled={testFalOpenRouterCompatibilityMutation.isPending}
                onClick={() => testFalOpenRouterCompatibilityMutation.mutate()}
              >
                {testFalOpenRouterCompatibilityMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Test fal OpenAI endpoint
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border bg-background/80 p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Endpoint</p>
                  <p className="break-all font-mono text-xs">
                    {openRouterEndpoint ?? "Not run yet"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">
                    {openRouterModel ?? "Not run yet"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Request id</p>
                  <p className="break-all font-mono text-xs">
                    {openRouterRequestId ?? "None yet"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Token usage</p>
                  <p className="font-medium">
                    {openRouterUsage?.total_tokens ?? "Not available yet"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Returned transcript
                </p>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-6">
                  {openRouterOutput ?? "Run the check to see the returned text."}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              `videos` and the finished asset should appear right here.
            </p>
            {lastTerminalStatus === "COMPLETED" && !matchingCompletedVideo ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Completion landed, waiting for the new `videos` row to refresh.
              </p>
            ) : null}
            {matchingCompletedVideo ? (
              <div className="mt-3 space-y-3">
                <div className="overflow-hidden rounded-xl border bg-black">
                  <video
                    key={matchingCompletedVideo.url}
                    src={matchingCompletedVideo.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[9/16] w-full bg-black object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <Link
                  href={matchingCompletedVideo.url}
                  target="_blank"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full gap-2",
                  })}
                >
                  Open completed video
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
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
