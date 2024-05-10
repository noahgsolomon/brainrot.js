"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Coins,
  Crown,
  Folder,
  Gem,
  Github,
  HeartCrack,
  Loader2,
  Star,
  StarIcon,
  Wand,
  X,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Tweet } from "react-tweet";
import XIcon from "@/components/svg/XIcon";
import Credits from "./credits";
import { subscribe } from "diagnostics_channel";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import ProductHuntIcon from "@/components/svg/ProductHuntIcon";
import ProButton from "./ProButton";

export default function Home({
  searchParams,
}: {
  searchParams: { loggedIn?: string; subscribed?: string };
}) {
  const user = useUser();
  const router = useRouter();

  if (searchParams.subscribed === "true") {
    toast.success("🎉 welcome to the family");
    router.push("/");
  }

  const userDB = trpc.user.user.useQuery().data;

  const [pendingVideo, setPendingVideo] = useState(false);
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
    if (user.isSignedIn) {
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
  }, [user.isSignedIn, videoStatus.data?.videos]);

  useEffect(() => {
    if (isInQueue) {
      toast.info("Your video is currently in queue", { icon: "🕒" });
      setPendingVideo(true);
    }
  }, [isInQueue]);

  return (
    <>
      <main className="relative mt-6 flex flex-col items-center justify-center gap-4">
        <div className="mt-[100px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
          <div className="flex flex-col items-center justify-center gap-8 pb-8">
            {/* <div className="coarse:hidden">
            <FlyingGifs gifs={gifs} />
          </div> */}
            {/* <Link
              className="flex flex-col items-center gap-1"
              href="https://www.producthunt.com/products/brainrot-js"
              target="_blank"
            >
              <img
                className="h-[43px] w-[200]"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=455445&theme=light"
                alt="Brainrot&#0046;js - Rot&#0032;your&#0032;brain&#0032;one&#0032;AI&#0032;generated&#0032;video&#0032;at&#0032;a&#0032;time&#0046; | Product Hunt"
              />
            </Link> */}

            <Image
              src={"https://images.smart.wtf/brainrot.png"}
              width={200}
              height={200}
              alt="brainrot"
              className="cursor-pointer rounded-full border-[10px] border-card shadow-lg transition-all hover:scale-[101%] active:scale-[99%] dark:border-primary"
            />
            <div className=" flex flex-col items-center gap-2">
              <Badge
                className="cursor-pointer text-sm md:hidden"
                variant={userDB?.user?.subscribed ? "hard" : "blue"}
              >
                <Link
                  target="_blank"
                  className="flex flex-row items-center gap-2"
                  href={"https://github.com/noahgsolomon/brainrot.js"}
                >
                  {userDB?.user?.subscribed ? (
                    <>
                      PRO <Gem className="size-4  fill-teal-500" />
                    </>
                  ) : (
                    <>
                      Free Mode <HeartCrack className="size-4 fill-red-500" />
                    </>
                  )}
                </Link>
              </Badge>

              <h1 className="relative max-w-[10ch] text-center text-5xl font-bold lg:text-6xl">
                BRAINROT.JS
                <Badge
                  className="absolute -top-8 hidden cursor-pointer text-sm md:-right-12 md:block"
                  variant={userDB?.user?.subscribed ? "hard" : "blue"}
                >
                  <Link
                    className="flex flex-row items-center gap-2"
                    target="_blank"
                    href={"https://github.com/noahgsolomon/brainrot.js"}
                  >
                    {userDB?.user?.subscribed ? (
                      <>
                        PRO <Gem className="size-4  fill-teal-500" />
                      </>
                    ) : (
                      <>
                        Free Mode <HeartCrack className="size-4 fill-red-500" />
                      </>
                    )}
                  </Link>
                </Badge>
              </h1>
              <p className="max-w-[30ch] text-sm italic">
                <Link
                  href={"https://github.com/noahgsolomon/brainrot.js"}
                  className="flex flex-col items-center gap-1 font-bold "
                >
                  now open source!
                  <div className="flex flex-row items-center gap-2 underline transition-all hover:text-primary/80">
                    <Star className="size-3 fill-yellow-500 text-yellow-400" />
                    star on github{" "}
                    <Star className="size-3 fill-yellow-500 text-yellow-400" />
                  </div>
                </Link>
              </p>
            </div>
            {pendingVideo && placeInQueue >= 1 && progress === 0 ? (
              <div className="flex max-w-[300px] flex-col gap-4 rounded-lg border border-border bg-card/80 p-4 text-center text-sm shadow-sm">
                <div>
                  Sorry for the long ass queue bro 🤕. If you want to run
                  locally check{" "}
                  <Link
                    href="https://github.com/noahgsolomon/brainrot.js"
                    target="_blank"
                    className="font-bold underline"
                  >
                    here!
                  </Link>
                </div>
                {!userDB?.user?.subscribed ? (
                  <p className="flex flex-col items-center gap-2">
                    Want to skip the queue?{" "}
                    <Link
                      onClick={() => setIsOpen(false)}
                      href={"/pricing"}
                      className={buttonVariants({
                        className: "flex flex-row items-center gap-2 ",
                        variant: "gold",
                        size: "sm",
                      })}
                    >
                      GO PRO <Crown className="size-4" />
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
            {!userDB?.user?.subscribed &&
            userDB?.user?.credits === 0 &&
            !pendingVideo ? (
              <div className="rounded-lg border border-destructive bg-destructive/60 p-4 text-sm text-secondary shadow-sm dark:text-primary">
                You are all out of credits 😥...{" "}
                <ProButton>
                  <Button
                    className="p-0 text-secondary underline dark:text-primary"
                    variant={"link"}
                  >
                    subscribe
                  </Button>
                </ProButton>
                to get more (250 credits)
              </div>
            ) : null}
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
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="flex flex-row items-center gap-2"
              variant={"brain"}
              disabled={pendingVideo}
              onClick={() => {
                setIsOpen(true);
              }}
            >
              <Wand className="h-4 w-4" /> Create Video
            </Button>
            {userDB?.user?.id && !userDB?.user?.subscribed ? (
              <ProButton>
                <Button
                  className={"flex w-full flex-row items-center gap-2"}
                  variant={"gold"}
                >
                  GO PRO <Crown className="size-4" />
                </Button>
              </ProButton>
            ) : null}
            {pendingVideo ? (
              <Button
                className="flex flex-row items-center gap-2 border border-red-500/60 bg-red-500/20"
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

            {user.isSignedIn ? (
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
            ) : !user.isLoaded ? (
              <>
                <Skeleton className="h-[2.4rem] w-[9.3rem] rounded-lg"></Skeleton>
                <Skeleton className="h-[2.4rem] w-[9.3rem] rounded-lg"></Skeleton>
              </>
            ) : null}
          </div>
        </div>
        {/* <p className="max-w-[300px] pt-12 text-center italic">
          To anyone who supports us on{" "}
          <Link
            target="_blank"
            className="underline"
            href={"https://www.producthunt.com/products/brainrot-js"}
          >
            Product Hunt
          </Link>
          ... I will kiss u fr 😽
        </p> */}
        <div className="pt-48">
          <p className="text-center text-3xl font-bold">Recent Generations</p>
          <div className="mx-auto flex max-w-[80%] flex-col items-center justify-center gap-4 md:max-w-[1200px] md:flex-row md:flex-wrap">
            <Tweet id="1787633614835843302" />
            <Tweet id="1787434978780819569" />
            <Tweet id="1786844526646063208" />
          </div>
        </div>
      </main>
      <footer className="flex w-screen justify-center border-t border-border bg-secondary px-4 py-4">
        <div className="flex w-full items-center justify-between px-[5%] py-1 md:px-[10%]">
          <Image
            src={"https://images.smart.wtf/brainrot.png"}
            width={64}
            height={64}
            alt="brainrot"
            className="cursor-pointer rounded-full border border-card shadow-lg transition-all hover:scale-[101%] active:scale-[99%] dark:border-primary"
          />
          <div className="flex flex-row items-center justify-center gap-2">
            <Link href={"https://github.com/noahgsolomon/brainrot.js"}>
              <Github className="size-6" />
            </Link>
            <Link href={"https://twitter.com/brainrotjs"}>
              <XIcon className="size-6 fill-primary" />
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
