"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Folder, Gem, Loader2, Star, Wand } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tweet } from "react-tweet";

export default function Home({
  searchParams,
}: {
  searchParams: { loggedIn: string };
}) {
  const user = useUser();
  const router = useRouter();

  const [pendingVideo, setPendingVideo] = useState(false);
  const [placeInQueue, setPlaceInQueue] = useState(0);
  const [currentlyInQueue, setCurrentlyInQueue] = useState(false);

  // useEffect(() => {
  //   if (searchParams.loggedIn === "true") {
  //     setTimeout(() => {
  //       toast.success(`Welcome in!`, { icon: "👋" });
  //     }, 1000);
  //   }
  // }, []);

  const videoStatus = trpc.user.videoStatus.useQuery();
  const { setIsOpen, isInQueue, setIsInQueue } = useCreateVideo();
  const { setIsOpen: setIsYourVideosOpen, setRefetchVideos } = useYourVideos();

  useEffect(() => {
    const intervalId = setInterval(() => {
      videoStatus.refetch();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [videoStatus]);

  useEffect(() => {
    if (user.isSignedIn) {
      if (
        videoStatus.data?.videos !== null &&
        videoStatus.data?.videos !== undefined
      ) {
        setCurrentlyInQueue(true);
        setPlaceInQueue(videoStatus.data.queueLength);
        setPendingVideo(true);
        setIsInQueue(true);
      } else if (currentlyInQueue) {
        setRefetchVideos(true);
        setCurrentlyInQueue(false);
        setPendingVideo(false);
        setIsInQueue(false);
        toast.success("Your video has been generated!", { icon: "🎉" });
        setIsYourVideosOpen(true);
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
    <main className="relative mt-6 flex flex-col items-center justify-center gap-4">
      <div className="mt-[100px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
        <div className="flex flex-col items-center justify-center gap-8 pb-8">
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
              variant={"hard"}
            >
              <Link
                target="_blank"
                className="flex flex-row items-center gap-2"
                href={"https://github.com/noahgsolomon/brainrot.js"}
              >
                #FREE <Gem className="size-4 fill-teal-500" />
              </Link>
            </Badge>
            <h1 className="relative max-w-[10ch] text-center text-5xl font-bold lg:text-6xl">
              BRAINROT.JS
              <Badge
                className="absolute -top-8 hidden cursor-pointer text-sm md:-right-12 md:block"
                variant={"hard"}
              >
                <Link
                  className="flex flex-row items-center gap-2"
                  target="_blank"
                  href={"https://github.com/noahgsolomon/brainrot.js"}
                >
                  #FREE <Gem className="size-4  fill-teal-500" />
                </Link>
              </Badge>
            </h1>
            {pendingVideo && (
              <div className="flex flex-row items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="flex gap-2">
                  <span className="font-bold">Place in queue:</span>{" "}
                  {placeInQueue} <span className="font-bold">Est:</span>{" "}
                  {(placeInQueue + 1) * 2} mins
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={"https://github.com/noahgsolomon/brainrot.js"}
            className={cn(buttonVariants(), "flex flex-row items-center gap-2")}
            target="_blank"
          >
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-300 dark:text-yellow-700" />{" "}
            Star on GitHub
          </Link>
          <Button
            className="flex flex-row items-center gap-2"
            variant={"rainbow"}
            disabled={pendingVideo}
            onClick={() => {
              setIsOpen(true);
            }}
          >
            <Wand className="h-4 w-4" /> Create Video
          </Button>

          {user.isSignedIn ? (
            <Button
              variant={"outline"}
              className="flex flex-row items-center gap-2"
              onClick={() => setIsYourVideosOpen(true)}
            >
              <Folder className="h-4 w-4" />
              Your videos
            </Button>
          ) : !user.isLoaded ? (
            <Skeleton className="h-[2.4rem] w-[8.9rem] rounded-lg"></Skeleton>
          ) : null}
        </div>
      </div>
      <p className="max-w-[30ch] text-sm italic">
        <Link
          href={"https://github.com/noahgsolomon/brainrot.js"}
          className="font-bold"
        >
          Starring on GitHub
        </Link>{" "}
        greatly supports my efforts (this kinda costs a lot 💀) -{" "}
        <Link
          className="underline"
          target="_blank"
          href={"https://twitter.com/noahgsolomon"}
        >
          @Noah
        </Link>
      </p>
      <div className="pt-48 coarse:hidden">
        <p className="text-center text-3xl font-bold">Wall of Fame</p>
        <div className="flex max-w-[1200px] flex-col items-center justify-center gap-4 md:flex-row md:flex-wrap">
          <Tweet id="1777773736416206948" />
          <Tweet id="1777767131998019762" />
          <Tweet id="1778059188742099419" />
          <Tweet id="1777944936874393936" />
          <Tweet id="1778012232250532213" />
          <Tweet id="1777789848645959783" />
        </div>
      </div>
    </main>
  );
}
