"use client";

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
import { trpc } from "@/trpc/client";
import Credits from "./credits";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { useGenerationType } from "./usegenerationtype";
import { currentUser } from "@clerk/nextjs/server";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ClientTweetCard from "@/components/magicui/client-tweet-card";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatEtaSeconds, useLiveEta } from "@/lib/use-live-eta";
import LatestGenerations from "@/components/latest-generations";

const buttonVariantsAnimated = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.03,
    transition: {
      duration: 0.2,
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
  etaConfidence: string | null;
  etaSampleSize: number | null;
  queueLength: number;
};

export default function PageClient({
  searchParams,
  initialPendingVideos,
  clerkUser,
  initialActiveQueueCount,
  initialLatestGenerations,
}: {
  searchParams: { [key: string]: string | undefined };
  initialPendingVideos: PendingVideoItem[];
  clerkUser:
    | {
        id: string | null | undefined;
        email: string | null | undefined;
        firstName: string | null | undefined;
        lastName: string | null | undefined;
        imageUrl: string | null | undefined;
      }
    | null
    | undefined;
  initialActiveQueueCount: number;
  initialLatestGenerations: {
    id: number;
    title: string;
    url: string;
    thumbnail: string;
    agent1: string;
    agent2: string;
  }[];
}) {
  const router = useRouter();

  if (searchParams.subscribed === "true") {
    toast.success("🎉 welcome to the family");
    router.push("/");
  }
  if (searchParams.error === "true") {
    toast.error("Error. Please try again.");
    router.push("/");
  }

  const { setIsOpen: setIsGenerationTypeOpen, setVideoDetails } =
    useGenerationType();

  const videoStatus = trpc.user.videoStatus.useQuery(undefined, {
    initialData: initialPendingVideos.length > 0
      ? { videos: initialPendingVideos }
      : undefined,
  });

  const pendingVideos = videoStatus.data?.videos ?? [];
  const hasPendingVideos = pendingVideos.length > 0;

  // Refetch while any videos are pending
  useEffect(() => {
    if (!hasPendingVideos) return;
    const id = setInterval(() => videoStatus.refetch(), 5000);
    return () => clearInterval(id);
  }, [hasPendingVideos]);

  const {
    setIsOpen,
    isInQueue,
    setIsInQueue,
    submittedAgent1,
    submittedAgent2,
    submittedTitle,
  } = useCreateVideo();
  const { setIsOpen: setIsYourVideosOpen, setRefetchVideos } = useYourVideos();

  const deletePendingVideoMutation = trpc.user.deletePendingVideo.useMutation({
    onSuccess: () => {
      videoStatus.refetch();
    },
  });

  const cancelPendingVideoMutation = trpc.user.cancelPendingVideo.useMutation({
    onSuccess: () => {
      toast.success("Cancelled video generation!");
      videoStatus.refetch();
    },
  });

  // Handle completions and errors for each video
  const handledVideoIds = useRef(new Set<number>());
  useEffect(() => {
    if (!clerkUser?.id) return;
    for (const video of pendingVideos) {
      if (handledVideoIds.current.has(video.id)) continue;
      if (video.status === "COMPLETED") {
        handledVideoIds.current.add(video.id);
        toast.success("Your media has been generated!", { icon: "🎉" });
        setRefetchVideos(true);
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
  }, [pendingVideos]);

  const userVideosQuery = trpc.user.userVideos.useQuery();

  useEffect(() => {
    if (isInQueue) {
      toast.info("Your video is currently in queue", { icon: "🕒" });
      videoStatus.refetch();
    }
  }, [isInQueue]);

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
      <AnimatePresence>
        {pendingVideo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative w-80 rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm"
          >
            {/* Dashed header with avatars + topic */}
            {(pendingAgent1 || submittedAgent1 || pendingAgent2 || submittedAgent2 || pendingVideoTitle || submittedTitle) && (
              <div className="mb-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
                {(pendingAgent1 || submittedAgent1 || pendingAgent2 || submittedAgent2) && (
                  <div className="flex justify-center">
                    <div className="flex flex-row-reverse">
                      {(pendingAgent2 || submittedAgent2) && (
                        <Image
                          src={`/img/${pendingAgent2 || submittedAgent2}.png`}
                          alt={pendingAgent2 || submittedAgent2}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                        />
                      )}
                      {(pendingAgent1 || submittedAgent1) && (
                        <Image
                          src={`/img/${pendingAgent1 || submittedAgent1}.png`}
                          alt={pendingAgent1 || submittedAgent1}
                          width={48}
                          height={48}
                          className="-mr-3 h-12 w-12 rounded-full border-2 border-background object-cover shadow-sm"
                        />
                      )}
                    </div>
                  </div>
                )}
                {(pendingVideoTitle || submittedTitle) && (
                  <p className="w-full truncate text-center text-lg font-semibold text-foreground/70">
                    {pendingVideoTitle || submittedTitle}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-row items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <span className="font-bold">Place in queue:</span>{" "}
                  {progress > 0 ? 0 : placeInQueue}
                </motion.div>
              </div>
              <div>
                <span className="font-bold">Status:</span> {status}
              </div>
              <div>
                <span className="font-bold">Est. time remaining: </span>{" "}
                {formatEtaSeconds(liveEstimatedMsRemaining) ?? "Estimating..."}
              </div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="flex w-full flex-row items-center gap-2"
              >
                <p className="text-xs">{progress}%</p>
                <Progress className="w-full" value={progress} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex w-full flex-col gap-4">
        <div className="flex justify-center">
          <Button
            className="flex w-80 flex-row items-center justify-center gap-2 text-lg text-secondary dark:text-primary"
            variant={"pink"}
            size={"lg"}
            disabled={pendingVideo}
            onClick={() => {
              setIsGenerationTypeOpen(true);
            }}
          >
            <Wand className="h-5 w-5" /> Create Video
          </Button>
        </div>

        {/* <motion.div variants={buttonVariantsAnimated} className="w-full"> */}
        {/* <Link
            href={"https://github.com/noahgsolomon/brainrot.js"}
            target="_blank"
            className={buttonVariants({
              className:
                "flex w-full flex-row items-center justify-center gap-2 text-lg",
              size: "lg",
              variant: "outline",
            })}
          >
            <Star className="h-5 w-5" />
            <p className="text-lg">Run Locally (free)</p>
          </Link> */}
        {/* </motion.div> */}
        {/*
        <motion.div variants={buttonVariantsAnimated} className="w-full">
          <Link
            href={"https://deepfi.sh?utm_source=brainrot&utm_medium=referral"}
            target="_blank"
            className="group flex w-full flex-row items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:scale-105 active:scale-95"
          >
            <Image
              src="/deepfish.png"
              width={20}
              height={20}
              alt="Deep Fish logo"
              className="h-5 w-5"
            />
            Try Deep Fish
          </Link>
        </motion.div> */}

        {pendingVideo && (
          <div className="flex justify-center">
            <Button
              className="flex w-80 flex-row items-center justify-center gap-2 border border-red-500/60 bg-red-500/20 text-lg hover:bg-red-500/30"
              variant={"outline"}
              onClick={() => {
                cancelPendingVideoMutation.mutate({
                  id: videoStatus.data?.videos?.id ?? 0,
                  credits: videoStatus.data?.videos?.credits ?? 0,
                });
              }}
            >
              <X className="h-5 w-5 text-red-500" /> Cancel Generation
            </Button>
          </div>
        )}

        {clerkUser?.id && (
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
      <LiveQueueActivity initialCount={initialActiveQueueCount} />

      {/* How it works */}
      <div className="mt-8 flex w-full max-w-2xl flex-col items-center gap-6">
        <h2 className="text-xl font-bold">How it works</h2>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center">
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
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center">
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
          </div>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/50 p-4 text-center">
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
          </div>
        </div>
      </div>

      {/* Latest Generations */}
      <LatestGenerations initialData={initialLatestGenerations} />

      {/* Not Trusted By marquee */}
      <div className="mt-12 flex w-full max-w-2xl flex-col items-center gap-3">
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
      </div>
    </>
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

function LiveQueueActivity({ initialCount }: { initialCount: number }) {
  const activeQueue = trpc.user.activeQueueCount.useQuery(undefined, {
    refetchInterval: 10000,
    initialData: { count: initialCount },
  });

  const count = activeQueue.data?.count ?? initialCount;

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
