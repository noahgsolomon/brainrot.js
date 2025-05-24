"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Folder, Loader2, Star, Wand, X } from "lucide-react";
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

export default function PageClient({
  searchParams,
  initialPendingVideo,
  clerkUser,
}: {
  searchParams: { [key: string]: string | undefined };
  initialPendingVideo: boolean;
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

  const [pendingVideo, setPendingVideo] = useState(initialPendingVideo);
  const [placeInQueue, setPlaceInQueue] = useState(0);
  const [pendingVideoTitle, setPendingVideoTitle] = useState("");

  const videoStatus = trpc.user.videoStatus.useQuery();

  const { setIsOpen, isInQueue, setIsInQueue } = useCreateVideo();
  const { setIsOpen: setIsYourVideosOpen, setRefetchVideos } = useYourVideos();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Waiting in Queue");

  const deletePendingVideoMutation = trpc.user.deletePendingVideo.useMutation({
    onSuccess: () => {
      setProgress(0);
      setStatus("Waiting in Queue");
      setIsInQueue(false);
      setPendingVideo(false);
      setPendingVideoTitle("");
    },
  });

  const cancelPendingVideoMutation = trpc.user.cancelPendingVideo.useMutation({
    onSuccess: () => {
      toast.success("deleted video generation!");
      setProgress(0);
      setStatus("Waiting in Queue");
      setIsInQueue(false);
      setPendingVideo(false);
      setPendingVideoTitle("");
      window.location.reload();
    },
  });

  useEffect(() => {
    if (isInQueue) {
      const intervalId = setInterval(() => {
        videoStatus.refetch();
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [videoStatus]);

  useEffect(() => {
    if (clerkUser?.id) {
      if (
        videoStatus.data?.videos !== null &&
        videoStatus.data?.videos !== undefined
      ) {
        setProgress(videoStatus.data.videos.progress);
        setStatus(videoStatus.data.videos.status);
        if (videoStatus.data.videos.status === "COMPLETED") {
          toast.success("Your media has been generated!", { icon: "🎉" });
          setRefetchVideos(true);
          deletePendingVideoMutation.mutate({ id: videoStatus.data.videos.id });
          setIsYourVideosOpen(true);
        } else if (videoStatus.data.videos.status === "ERROR") {
          toast.error(
            "Your video was not able to be generated. Please try again.",
            { icon: "💣" },
          );
          deletePendingVideoMutation.mutate({ id: videoStatus.data.videos.id });
        } else {
          setPendingVideoTitle(videoStatus.data.videos.title ?? "");
          setPendingVideo(true);
          setIsInQueue(true);
          setPlaceInQueue(videoStatus.data.queueLength);
        }
      }
    }
  }, [videoStatus.data?.videos]);

  const userVideosQuery = trpc.user.userVideos.useQuery();

  useEffect(() => {
    if (isInQueue) {
      toast.info("Your video is currently in queue", { icon: "🕒" });
      setPendingVideo(true);
    }
  }, [isInQueue]);
  return (
    <>
      <AnimatePresence>
        {pendingVideo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm"
          >
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
              {(
                (progress > 0 ? 0 : placeInQueue * 4) +
                ((100 - progress) / 100) * 4
              ).toFixed(2)}{" "}
              mins
            </div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              className="flex w-full flex-row items-center gap-2"
            >
              <p className="text-xs">{progress}%</p>
              <Progress className="w-full" value={progress} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex w-full flex-col gap-4"
      >
        <motion.div variants={buttonVariantsAnimated} className="w-full">
          <p className="text-sm text-muted-foreground">
            Disabled for the time being. Run locally for now.
          </p>
          <Button
            className="flex w-full flex-row items-center justify-center gap-2 text-lg text-secondary dark:text-primary"
            variant={"pink"}
            size={"lg"}
            // disabled={pendingVideo}
            disabled={true}
            onClick={() => {
              setIsGenerationTypeOpen(true);
            }}
          >
            <Wand className="h-5 w-5" /> Create Video
          </Button>
        </motion.div>

        <motion.div variants={buttonVariantsAnimated} className="w-full">
          <Link
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
          </Link>
        </motion.div>
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

        <AnimatePresence>
          {pendingVideo && (
            <motion.div
              variants={buttonVariantsAnimated}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <Button
                className="flex w-full flex-row items-center justify-center gap-2 border border-red-500/60 bg-red-500/20 text-lg hover:bg-red-500/30"
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
            </motion.div>
          )}
        </AnimatePresence>

        {clerkUser?.id && (
          <motion.div
            variants={buttonVariantsAnimated}
            className="flex w-full flex-col gap-4"
          >
            <Credits />
            <motion.div variants={buttonVariantsAnimated} className="w-full">
              <Button
                variant={"outline"}
                className="flex w-full flex-row items-center justify-center gap-2 text-lg"
                onClick={() => setIsYourVideosOpen(true)}
              >
                <Folder className="h-5 w-5" />
                Your videos
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
