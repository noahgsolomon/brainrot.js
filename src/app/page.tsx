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
  Folder,
  Gem,
  Github,
  HeartCrack,
  Loader2,
  Star,
  Wand,
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

  // const gifs = useMemo(() => {
  //   return [
  //     "/brainnnn.gif",
  //     "/brain.gif",
  //     "/clubpengu.gif",
  //     "dancepepe.gif",
  //     "/homer.gif",
  //     "/sponge.gif",
  //     "/par.gif",
  //     "/cato.gif",
  //     "/OHNOHESHOT.gif",
  //     "/roachmf.gif",
  //     "/dance.gif",
  //     "/flower.gif",
  //     "/lick.gif",
  //     "/krustykrabpizza.gif",
  //     "/duck.gif",
  //   ];
  // }, []);

  const [pendingVideo, setPendingVideo] = useState(false);
  const [placeInQueue, setPlaceInQueue] = useState(0);
  const [currentlyInQueue, setCurrentlyInQueue] = useState(false);

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
    <>
      <main className="relative mt-6 flex flex-col items-center justify-center gap-4">
        <div className="mt-[100px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
          <div className="flex flex-col items-center justify-center gap-8 pb-8">
            {/* <div className="coarse:hidden">
            <FlyingGifs gifs={gifs} />
          </div> */}

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
                  className="font-bold"
                >
                  now open source!
                </Link>
              </p>
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
            <Link
              href={"https://github.com/noahgsolomon/brainrot.js"}
              className={cn(
                buttonVariants({ variant: "gold" }),
                "flex flex-row items-center gap-2",
              )}
              target="_blank"
            >
              <Star className="size-4  text-secondary dark:text-primary" />
              Star on GitHub
            </Link>
            {user.isSignedIn ? (
              <>
                <Credits />
                <Button
                  variant={"outline"}
                  className="flex flex-row items-center gap-2"
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
        <div className="pt-48">
          <p className="text-center text-3xl font-bold">Recent Generations</p>
          <div className="mx-auto flex max-w-[80%] flex-col items-center justify-center gap-4 md:max-w-[1200px] md:flex-row md:flex-wrap">
            <Tweet id="1780025664608821715" />
            <Tweet id="1779908542306345061" />
            <Tweet id="1778059188742099419" />
            <Tweet id="1777944936874393936" />
            <Tweet id="1778012232250532213" />
            <Tweet id="1777789848645959783" />
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
