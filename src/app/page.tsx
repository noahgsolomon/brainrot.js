"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Folder, Loader2, Wand } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";
import Link from "next/link";

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

  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);
  const videoRef3 = useRef(null);
  const videoRef4 = useRef(null);
  const videoRef5 = useRef(null);
  const videoRef6 = useRef(null);
  const videoRef7 = useRef(null);
  const videoRef8 = useRef(null);
  const videoRef9 = useRef(null);

  useEffect(() => {
    if (isInQueue) {
      toast.info("Your video is currently in queue", { icon: "🕒" });
      setPendingVideo(true);
    }
  }, [isInQueue]);

  const handleMouseEnter = (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleMouseLeave = (videoRef: React.RefObject<HTMLVideoElement>) => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

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
              variant={"math"}
            >
              <Link target="_blank" href={"https://smart.wtf"}>
                @SMART.WTF
              </Link>
            </Badge>
            <h1 className="relative max-w-[10ch] text-center text-5xl font-bold lg:text-6xl">
              BRAINROT.JS
              <Badge
                className="absolute -top-8 hidden cursor-pointer text-sm md:-right-12 md:block"
                variant={"math"}
              >
                <Link target="_blank" href={"https://smart.wtf"}>
                  @SMART.WTF
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
      <div className="pt-48 coarse:hidden">
        <p className="text-center text-3xl font-bold">
          Most Recent User Generations
        </p>
        <div className="flex max-w-[1200px] flex-col items-center justify-center gap-4 md:flex-row md:flex-wrap">
          <video
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            ref={videoRef1}
            onMouseEnter={() => handleMouseEnter(videoRef1)}
            onMouseLeave={() => handleMouseLeave(videoRef1)}
            width={300}
            height={300}
            src={
              "https://images.smart.wtf/videos/005e7fc7-d4aa-452e-b638-9997364570ee.mp4"
            }
            loop
            controls
            muted
          ></video>
          <video
            ref={videoRef2}
            onMouseEnter={() => handleMouseEnter(videoRef2)}
            onMouseLeave={() => handleMouseLeave(videoRef2)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100 "
            width={300}
            height={300}
            src={
              "https://images.smart.wtf/videos/4e8982c3-d0b6-4fa4-8666-7a6b40d524f7.mp4"
            }
            loop
            controls
            muted
          ></video>
          <video
            ref={videoRef3}
            onMouseEnter={() => handleMouseEnter(videoRef3)}
            onMouseLeave={() => handleMouseLeave(videoRef3)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={
              "https://images.smart.wtf/videos/54f40c27-d4b8-481b-9c37-9637c8d92164.mp4"
            }
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef4}
            onMouseEnter={() => handleMouseEnter(videoRef4)}
            onMouseLeave={() => handleMouseLeave(videoRef4)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={
              "https://images.smart.wtf/videos/699d563a-b438-4df5-9618-db5024632055.mp4"
            }
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef5}
            onMouseEnter={() => handleMouseEnter(videoRef5)}
            onMouseLeave={() => handleMouseLeave(videoRef5)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={
              "https://images.smart.wtf/videos/27982a37-5197-4622-8949-6e86ce35212f.mp4"
            }
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef6}
            onMouseEnter={() => handleMouseEnter(videoRef6)}
            onMouseLeave={() => handleMouseLeave(videoRef6)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={"https://images.smart.wtf/videos/random1.mp4"}
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef7}
            onMouseEnter={() => handleMouseEnter(videoRef7)}
            onMouseLeave={() => handleMouseLeave(videoRef7)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={"https://images.smart.wtf/videos/random2.mp4"}
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef8}
            onMouseEnter={() => handleMouseEnter(videoRef8)}
            onMouseLeave={() => handleMouseLeave(videoRef8)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={"https://images.smart.wtf/videos/random3.mp4"}
            loop
            muted
            controls
          ></video>
          <video
            ref={videoRef9}
            onMouseEnter={() => handleMouseEnter(videoRef9)}
            onMouseLeave={() => handleMouseLeave(videoRef9)}
            className="scale-[90%] rounded-lg border opacity-50 shadow-md transition-all hover:opacity-100"
            width={300}
            height={300}
            src={"https://images.smart.wtf/videos/random4.mp4"}
            loop
            muted
            controls
          ></video>
        </div>
      </div>
    </main>
  );
}
