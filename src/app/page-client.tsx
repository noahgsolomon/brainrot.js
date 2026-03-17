"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Crown,
  Folder,
  Loader2,
  Star,
  Wand,
  X,
  GraduationCap,
  Rocket,
  Landmark,
  Globe,
  Atom,
  Church,
  Zap,
  Home,
  FlaskConical,
  Castle,
  Anchor,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import Credits from "./credits";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useGenerationType } from "./usegenerationtype";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ClientTweetCard from "@/components/magicui/client-tweet-card";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatEtaSeconds, useLiveEta } from "@/lib/use-live-eta";
import LatestGenerations from "@/components/latest-generations";
import type { CreateVideoSearchParams } from "@/lib/create-video-search-params";

const buttonVariantsAnimated = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      visualDuration: 0.3,
      bounce: 0.1,
    },
  },
  hover: {
    scale: 1.03,
    transition: {
      type: "spring" as const,
      visualDuration: 0.15,
      bounce: 0.3,
    },
  },
  tap: { scale: 0.97 },
};

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const sectionEntrance = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      visualDuration: 0.5,
      bounce: 0.1,
    },
  },
};

const staggeredSection = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const staggeredChild = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      visualDuration: 0.4,
      bounce: 0.15,
    },
  },
};

type PendingVideoItem = {
  id: number;
  title: string | null;
  agent1: string | null;
  agent2: string | null;
  status: string;
  progress: number;
  credits: number;
  phaseKey: string | null;
  estimatedMsRemaining: number | null;
  estimatedMsTotal: number | null;
  etaConfidence: "none" | "low" | "medium" | "high";
  etaSampleSize: number;
  queueLength: number;
};

function isTerminalStatus(status: string | undefined) {
  if (!status) {
    return false;
  }

  const normalizedStatus = status.toUpperCase();
  return normalizedStatus === "COMPLETED" || normalizedStatus === "ERROR";
}

function hasActivePendingVideos(videos: PendingVideoItem[] | undefined) {
  return (videos ?? []).some((video) => !isTerminalStatus(video.status));
}

export default function PageClient({
  searchParams,
  initialSignedIn,
}: {
  searchParams: CreateVideoSearchParams;
  initialSignedIn: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const isSignedIn = isLoaded ? Boolean(user?.id) : initialSignedIn;

  useEffect(() => {
    if (searchParams.subscribed === "true") {
      toast.success("🎉 welcome to the family");
      router.push("/");
    } else if (searchParams.error === "true") {
      toast.error("Error. Please try again.");
      router.push("/");
    }
  }, [router, searchParams.error, searchParams.subscribed]);

  const { setIsOpen: setIsGenerationTypeOpen } = useGenerationType();

  const videoStatus = useQuery(
    trpc.user.videoStatus.queryOptions(undefined, {
      refetchInterval: (query) => {
        const data = query.state.data as { videos: PendingVideoItem[] } | undefined;
        return hasActivePendingVideos(data?.videos) ? 5000 : false;
      },
      refetchOnWindowFocus: false,
    }),
  );

  const pendingVideos = videoStatus.data?.videos ?? [];
  const hasPendingVideos = pendingVideos.length > 0;

  const {
    submittedAgent1,
    submittedAgent2,
    submittedTitle,
    clearSubmittedVideo,
  } = useCreateVideo();
  const { setIsOpen: setIsYourVideosOpen } = useYourVideos();

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
    }),
  );

  const cancelPendingVideoMutation = useMutation(
    trpc.user.cancelPendingVideo.mutationOptions({
      onSuccess: async () => {
        toast.success("Cancelled video generation!");
        await Promise.all([
          queryClient.invalidateQueries(trpc.user.videoStatus.queryFilter()),
          queryClient.invalidateQueries(
            trpc.user.activeQueueCount.queryFilter(),
          ),
          queryClient.invalidateQueries(trpc.user.user.queryFilter()),
        ]);
      },
    }),
  );

  useEffect(() => {
    if (hasPendingVideos) {
      clearSubmittedVideo();
    }
  }, [clearSubmittedVideo, hasPendingVideos]);

  // Handle completions and errors for each video
  const handledVideoIds = useRef(new Set<number>());
  useEffect(() => {
    if (!user?.id) return;

    for (const video of pendingVideos) {
      if (handledVideoIds.current.has(video.id)) continue;
      if (video.status === "COMPLETED") {
        handledVideoIds.current.add(video.id);
        toast.success("Your media has been generated!", { icon: "🎉" });
        void queryClient.invalidateQueries(trpc.user.userVideos.queryFilter());
        deletePendingVideoMutation.mutate({ id: video.id });
        setIsYourVideosOpen(true);
      } else if (video.status === "ERROR") {
        handledVideoIds.current.add(video.id);
        toast.error(
          "Your video was not able to be generated. Please try again.",
          { icon: "💣" },
        );
        deletePendingVideoMutation.mutate({ id: video.id });
      }
    }
  }, [
    deletePendingVideoMutation,
    pendingVideos,
    queryClient,
    setIsYourVideosOpen,
    trpc.user.userVideos,
    user?.id,
  ]);

  const handleCancel = useCallback(
    (video: PendingVideoItem) => {
      cancelPendingVideoMutation.mutate({
        id: video.id,
        credits: video.credits,
      });
    },
    [cancelPendingVideoMutation],
  );
  return (
    <>
      <PendingVideoStack
        videos={pendingVideos}
        onCancel={handleCancel}
        submittedAgent1={submittedAgent1}
        submittedAgent2={submittedAgent2}
        submittedTitle={submittedTitle}
      />

      <div className="flex w-full flex-col gap-4">
        <div className="flex justify-center">
          <Button
            className="flex w-80 flex-row items-center justify-center gap-2 text-lg text-secondary dark:text-primary"
            variant={"pink"}
            size={"lg"}
            onClick={() => {
              setIsGenerationTypeOpen(true);
            }}
          >
            <Wand className="h-5 w-5" /> Create Video
          </Button>
        </div>

        {isSignedIn && (
          <div className="flex flex-col items-center gap-4">
            <Credits />
            <div>
              <Button
                variant={"outline"}
                className="flex w-80 flex-row items-center justify-center gap-2 text-lg"
                onClick={() => setIsYourVideosOpen(true)}
              >
                <Folder className="h-5 w-5" />
                Your videos
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live Queue Activity */}
      <LiveQueueActivity />

      {/* How it works */}
      <motion.div
        className="mt-8 flex w-full max-w-2xl flex-col items-center gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggeredSection}
      >
        <motion.h2 className="text-xl font-bold" variants={staggeredChild}>
          How it works
        </motion.h2>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center"
            variants={staggeredChild}
          >
            <Image
              src="/idea.png"
              alt="Pick a topic"
              width={80}
              height={80}
              className="rounded-full border border-border"
            />
            <p className="text-sm font-semibold">Pick a topic</p>
            <p className="text-xs text-muted-foreground">
              Choose any topic and your favorite characters
            </p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center"
            variants={staggeredChild}
          >
            <Image
              src="/ai.png"
              alt="AI generates"
              width={80}
              height={80}
              className="rounded-full border border-border"
            />
            <p className="text-sm font-semibold">AI generates</p>
            <p className="text-xs text-muted-foreground">
              Our AI writes the script and creates your video
            </p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center"
            variants={staggeredChild}
          >
            <Image
              src="/share.png"
              alt="Download & share"
              width={80}
              height={80}
              className="rounded-full border border-border"
            />
            <p className="text-sm font-semibold">Download & share</p>
            <p className="text-xs text-muted-foreground">
              Get your video and post it everywhere
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Latest Generations */}
      <LatestGenerations />

      {/* Not Trusted By marquee */}
      <motion.div
        className="mt-12 flex w-full max-w-2xl flex-col items-center gap-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={sectionEntrance}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Definitely Not Trusted By
        </p>
        <div
          className="relative flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
          style={
            { "--duration": "30s", "--gap": "2.5rem" } as React.CSSProperties
          }
        >
          <div className="flex shrink-0 animate-marquee items-center gap-[--gap]">
            {FAKE_COMPANIES.map((company, i) => (
              <div
                key={i}
                className="flex select-none items-center gap-2 text-muted-foreground/30"
              >
                <company.icon className="h-6 w-6 shrink-0" />
                <span className="whitespace-nowrap text-sm font-semibold">
                  {company.name}
                </span>
              </div>
            ))}
          </div>
          <div
            className="flex shrink-0 animate-marquee items-center gap-[--gap]"
            aria-hidden
          >
            {FAKE_COMPANIES.map((company, i) => (
              <div
                key={i}
                className="flex select-none items-center gap-2 text-muted-foreground/30"
              >
                <company.icon className="h-6 w-6 shrink-0" />
                <span className="whitespace-nowrap text-sm font-semibold">
                  {company.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function PendingVideoCard({
  video,
  onCancel,
}: {
  video: PendingVideoItem;
  onCancel: (video: PendingVideoItem) => void;
}) {
  const fallbackMs =
    video.status !== "COMPLETED" && video.status !== "ERROR"
      ? ((video.progress > 0 ? 0 : video.queueLength * 4) +
          ((100 - video.progress) / 100) * 4) *
        60_000
      : null;

  const liveEta = useLiveEta(
    video.estimatedMsRemaining ?? fallbackMs,
    video.status !== "COMPLETED" && video.status !== "ERROR",
  );

  return (
    <div className="rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm">
      {/* Dashed header with avatars + topic */}
      {(video.agent1 || video.agent2 || video.title) && (
        <div className="mb-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
          {(video.agent1 || video.agent2) && (
            <div className="flex justify-center">
              <div className="flex flex-row-reverse">
                {video.agent2 && (
                  <Image
                    src={`/img/${video.agent2}.png`}
                    alt={video.agent2}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                  />
                )}
                {video.agent1 && (
                  <Image
                    src={`/img/${video.agent1}.png`}
                    alt={video.agent1}
                    width={48}
                    height={48}
                    className="-mr-3 h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                  />
                )}
              </div>
            </div>
          )}
          {video.title && (
            <p className="w-full truncate text-center text-lg font-semibold text-foreground/70">
              {video.title}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-row items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span>
            <span className="font-bold">Place in queue:</span>{" "}
            {video.progress > 0 ? 0 : video.queueLength}
          </span>
        </div>
        <div>
          <span className="font-bold">Status:</span> {video.status}
        </div>
        <div>
          <span className="font-bold">Est. time remaining: </span>
          {formatEtaSeconds(liveEta) ?? "Estimating..."}
        </div>

        {/* Progress bar with inline cancel */}
        <div className="flex w-full items-center gap-2">
          <p className="shrink-0 text-xs">{video.progress}%</p>
          <Progress className="flex-1" value={video.progress} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel(video);
            }}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Cancel generation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingVideoStack({
  videos,
  onCancel,
  submittedAgent1,
  submittedAgent2,
  submittedTitle,
}: {
  videos: PendingVideoItem[];
  onCancel: (video: PendingVideoItem) => void;
  submittedAgent1: string;
  submittedAgent2: string;
  submittedTitle: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const supportsHover =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches;

  // Show optimistic card when queue submitted but server hasn't responded yet
  const showOptimistic =
    (submittedAgent1 || submittedAgent2 || submittedTitle) &&
    videos.length === 0;

  if (videos.length === 0 && !showOptimistic) return null;

  if (showOptimistic) {
    return (
      <div className="w-80">
        <div className="rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm">
          {(submittedAgent1 || submittedAgent2 || submittedTitle) && (
            <div className="mb-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
              {(submittedAgent1 || submittedAgent2) && (
                <div className="flex justify-center">
                  <div className="flex flex-row-reverse">
                    {submittedAgent2 && (
                      <Image
                        src={`/img/${submittedAgent2}.png`}
                        alt={submittedAgent2}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                      />
                    )}
                    {submittedAgent1 && (
                      <Image
                        src={`/img/${submittedAgent1}.png`}
                        alt={submittedAgent1}
                        width={48}
                        height={48}
                        className="-mr-3 h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                      />
                    )}
                  </div>
                </div>
              )}
              {submittedTitle && (
                <p className="w-full truncate text-center text-lg font-semibold text-foreground/70">
                  {submittedTitle}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-row items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="font-bold">Waiting in Queue</span>
            </div>
            <div className="flex w-full items-center gap-2">
              <p className="shrink-0 text-xs">0%</p>
              <Progress className="flex-1" value={0} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single video — no stacking needed
  if (videos.length === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-80"
      >
        <PendingVideoCard video={videos[0]!} onCancel={onCancel} />
      </motion.div>
    );
  }

  // Multiple videos — sonner-style stack
  const maxVisibleBehind = 2; // show at most 2 peeking cards behind front

  return (
    <div
      className="relative w-80"
      onPointerEnter={() => supportsHover && setIsExpanded(true)}
      onPointerLeave={() => supportsHover && setIsExpanded(false)}
      onClick={() => !supportsHover && setIsExpanded((p) => !p)}
      style={{
        // Reserve space for peeking cards when collapsed
        paddingBottom: isExpanded
          ? 0
          : Math.min(videos.length - 1, maxVisibleBehind) * 8,
      }}
    >
      {/* Count badge */}
      <AnimatePresence>
        {!isExpanded && videos.length > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", visualDuration: 0.2, bounce: 0.4 }}
            className="absolute -right-2 -top-2 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow"
          >
            {videos.length}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {videos.map((video, index) => {
          const behindIndex = index; // 0 = front
          const scale = isExpanded
            ? 1
            : Math.max(1 - behindIndex * 0.05, 0.85);
          const yOffset = isExpanded ? 0 : behindIndex * 8;
          const opacity = isExpanded
            ? 1
            : Math.max(1 - behindIndex * 0.2, 0.4);

          return (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{
                opacity,
                y: yOffset,
                scale,
                zIndex: videos.length - index,
              }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", visualDuration: 0.25, bounce: 0.15 }}
              style={{
                position:
                  isExpanded || index === 0 ? "relative" : "absolute",
                top: 0,
                left: 0,
                right: 0,
                marginBottom: isExpanded ? 8 : 0,
                pointerEvents:
                  isExpanded || index === 0 ? "auto" : "none",
              }}
            >
              <PendingVideoCard video={video} onCancel={onCancel} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const FAKE_COMPANIES = [
  { name: "Harvard", icon: GraduationCap },
  { name: "NASA", icon: Rocket },
  { name: "The White House", icon: Landmark },
  { name: "United Nations", icon: Globe },
  { name: "MIT", icon: Atom },
  { name: "The Vatican", icon: Church },
  { name: "Tesla", icon: Zap },
  { name: "Your Mom's House", icon: Home },
  { name: "Area 51", icon: FlaskConical },
  { name: "Hogwarts", icon: Castle },
  { name: "The Krusty Krab", icon: Anchor },
];

function LiveQueueActivity() {
  const trpc = useTRPC();
  const activeQueue = useQuery(
    trpc.user.activeQueueCount.queryOptions(undefined, {
      refetchInterval: 10000,
      refetchOnWindowFocus: false,
    }),
  );

  const count = activeQueue.data?.count ?? 0;

  if (count === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      {count} video{count !== 1 ? "s" : ""} being generated right now
    </div>
  );
}
