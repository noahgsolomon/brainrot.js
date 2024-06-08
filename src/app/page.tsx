"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  Coins,
  Crown,
  Eye,
  Folder,
  Loader2,
  Skull,
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
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import ProButton from "./ProButton";
import NumberTicker from "@/components/magicui/number-ticker";

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
      <main className="relative flex flex-col items-center justify-center gap-4">
        <div className="mt-[100px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 pb-8 text-4xl lg:w-[80%] xl:w-[75%]">
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
            {/* <Link
              href={"https://github.com/noahgsolomon/brainrot.js"}
              target="_blank"
            >
              <AnimatedGradientText className="cursor-pointer">
                ⭐ <hr className="mx-2 h-4 w-[1px] shrink-0 bg-gray-300" />{" "}
                <span
                  className={cn(
                    `animate-gradient inline bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                  )}
                >
                  Star on GitHub
                </span>
              </AnimatedGradientText>
            </Link> */}

            <Image
              src={"https://images.smart.wtf/brainrot.png"}
              width={200}
              height={200}
              alt="brainrot"
              className="cursor-pointer rounded-full border-[10px] border-card shadow-lg transition-all hover:scale-[101%] active:scale-[99%] dark:border-primary"
            />

            <div className=" flex flex-col items-center gap-2">
              <div>
                <h1 className="relative max-w-[10ch] text-center text-5xl font-bold lg:text-6xl">
                  BRAINROT.JS
                </h1>
                <p className="flex w-full flex-row items-center justify-center gap-1 p-2 text-base font-normal italic">
                  <NumberTicker value={5994} /> videos generated 💀
                </p>
              </div>

              <p className="max-w-[30ch] text-sm italic">
                <Link
                  href={"https://github.com/noahgsolomon/brainrot.js"}
                  className="flex flex-col items-center gap-1 font-bold underline "
                >
                  now open source!{" "}
                </Link>
              </p>
            </div>
            {!userDB?.user?.subscribed &&
            userDB?.user?.credits === 0 &&
            !pendingVideo ? (
              <div className="flex max-w-[300px] flex-col gap-0 rounded-lg border border-border bg-card/80 p-4 text-center text-sm shadow-sm">
                <div className="flex flex-col gap-2 font-bold">
                  <div className="flex flex-col gap-1">
                    {" "}
                    go pro to generate videos!
                    <span className="text-xs font-normal italic">
                      (and to support me 🥹🫶)
                    </span>
                  </div>

                  <ProButton>
                    <Button
                      className={"flex w-full flex-row items-center gap-2"}
                      variant={"red"}
                    >
                      GO PRO <Crown className="size-4" />
                    </Button>
                  </ProButton>
                </div>
              </div>
            ) : null}

            {/* {!userDB?.user?.subscribed ? (
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
              ) : null} */}
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
            <Link
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
            </Link>

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
      </main>
      {/* <footer className="flex w-screen justify-center border-t border-border bg-secondary px-4 py-4">
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
      </footer> */}
    </>
  );
}
