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

  useEffect(() => {

    if (
      searchParams.agent1Id &&
      searchParams.agent2Id &&
      searchParams.agent1Name &&
      searchParams.agent2Name &&
      searchParams.title &&
      searchParams.credits &&
      searchParams.fps
    ) {
      setVideoDetails({
        brainrot: {
          agents: [
            {
              id: parseInt(searchParams.agent1Id),
              name: searchParams.agent1Name as
                | "JORDAN_PETERSON"
                | "ANDREW_TATE"
                | "BEN_SHAPIRO"
                | "JOE_ROGAN"
                | "BARACK_OBAMA"
                | "DONALD_TRUMP"
                | "KAMALA_HARRIS"
                | "JOE_BIDEN",
            },
            {
              id: parseInt(searchParams.agent2Id),
              name: searchParams.agent2Name as
                | "JORDAN_PETERSON"
                | "BEN_SHAPIRO"
                | "JOE_ROGAN"
                | "BARACK_OBAMA"
                | "DONALD_TRUMP"
                | "KAMALA_HARRIS"
                | "JOE_BIDEN"
                | "ANDREW_TATE",
            },
          ],
          assetType: searchParams.assetType ?? "GOOGLE",
          background: searchParams?.background ?? "MINECRAFT",
          cost: parseInt(searchParams.credits),
          duration: searchParams?.duration
            ? parseInt(searchParams?.duration)
            : 1,
          fps: parseInt(searchParams.fps),
          music: searchParams.music ?? "NONE",
          title: searchParams.title,
          // not used in this case
          remainingCredits: 0,
        },
        math: {},
      });
      setIsGenerationTypeOpen(true);
    }
  }, [searchParams]);

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
          toast.success("Your video has been generated!", { icon: "🎉" });
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
          setPendingVideoTitle(videoStatus.data.videos.title);
          setPendingVideo(true);
          setIsInQueue(true);
          setPlaceInQueue(videoStatus.data.queueLength);
        }
      }
    }
  }, [videoStatus.data?.videos]);

  useEffect(() => {
    if (isInQueue) {
      toast.info("Your video is currently in queue", { icon: "🕒" });
      setPendingVideo(true);
    }
  }, [isInQueue]);
  return (
    <>
      {pendingVideo && (
        <div className=" flex flex-col items-center gap-2 rounded-lg border border-border bg-card/80 p-4 text-sm shadow-sm">
          <div className="flex flex-row items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <div className="flex gap-2">
              <span className="font-bold">Place in queue:</span>{" "}
              {progress > 0 ? 0 : placeInQueue}
            </div>
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

          <div className="flex w-full flex-row items-center gap-2">
            <p className="text-xs">{progress}%</p>
            <Progress className="w-full" value={progress} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          className="flex flex-row items-center gap-2"
          variant={"brain"}
          size={"lg"}
          disabled={pendingVideo}
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <Wand className="h-4 w-4" /> Create Video
        </Button>
        <Link
          href={"https://github.com/noahgsolomon/brainrot.js"}
          target="_blank"
          className={buttonVariants({
            className: "flex flex-row items-center gap-2",
            size: "lg",
            variant: "outline",
          })}
        >
          <Star className="h-4 w-4 " />
          Star on GitHub
        </Link>
        {/* <Link
              href={"/watch"}
              className={buttonVariants({
                variant: "outline",
                className: "relative flex flex-row items-center gap-2",
              })}
            >
              <Eye className="size-4" /> Watch
              <Badge
                className="absolute -right-3 -top-[0.4rem] px-[0.2rem] py-[0.1rem] text-xs opacity-90"
                variant={"red"}
              >
                NEW
              </Badge>
            </Link> */}

        {pendingVideo ? (
          <Button
            className="flex flex-row items-center gap-2 border border-red-500/60 bg-red-500/20 hover:bg-red-500/30"
            variant={"outline"}
            onClick={() => {
              cancelPendingVideoMutation.mutate({
                id: videoStatus.data?.videos?.id ?? 0,
                credits: videoStatus.data?.videos?.credits ?? 0,
              });
            }}
          >
            <X className="h-4 w-4 text-red-500" /> Cancel Generation
          </Button>
        ) : null}

        {clerkUser?.id ? (
          <>
            <Credits />
            <Button
              variant={"outline"}
              className="flex flex-row items-center gap-2 "
              onClick={() => setIsYourVideosOpen(true)}
            >
              <Folder className="h-4 w-4" />
              Your videos
            </Button>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-4 py-36 ">
        <ClientTweetCard
          className=" bg-card/60 text-sm"
          id="1851433101798363562"
        />
        <ClientTweetCard
          className=" bg-card/60 text-sm"
          id="1787434978780819569"
        />
        <ClientTweetCard
          className=" bg-card/60 text-sm"
          id="1780386464091591078"
        />
      </div>
    </>
  );
}
