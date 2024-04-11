"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useYourVideos } from "./useyourvideos";
import { useCreateVideo } from "./usecreatevideo";
import { trpc } from "@/trpc/client";
import { useEffect, useRef, useState } from "react";
import { DownloadCloud, Play } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useDownloader from "react-use-downloader";
import { toast } from "sonner";
import ReactPlayer from "react-player";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";
import { StopIcon } from "@radix-ui/react-icons";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Link from "next/link";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const { isOpen, setIsOpen, refetchVideos, setRefetchVideos } =
    useYourVideos();
  const { setIsOpen: setIsCreateVideoOpen } = useCreateVideo();
  const [playing, setPlaying] = useState(-1);

  const userVideosQuery = trpc.user.userVideos.useQuery();

  useEffect(() => {
    if (refetchVideos) {
      userVideosQuery.refetch();
      setRefetchVideos(false);
    }
  }, [refetchVideos]);

  const [videos, setVideos] = useState(userVideosQuery.data?.videos ?? []);

  useEffect(() => {
    setVideos(userVideosQuery.data?.videos ?? []);
  }, [userVideosQuery.data?.videos]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[80%] overflow-y-auto rounded-lg sm:max-w-[425px]">
        {userVideosQuery.isFetched && videos.length > 0 ? (
          <Carousel>
            <CarouselContent className="flex flex-col items-center justify-center ">
              {videos.map((video, index) => {
                const agent1 = video.agent1;

                const agent2 = video.agent2;

                const url = video.url.replace(
                  "https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x",
                  "https://videos.brainrotjs.com",
                );

                const agent1Img =
                  agent1 === "JORDAN_PETERSON"
                    ? "https://images.smart.wtf/JORDAN_PETERSON.png"
                    : agent1 === "JOE_ROGAN"
                    ? "https://images.smart.wtf/JOE_ROGAN.png"
                    : agent1 === "BARACK_OBAMA"
                    ? "https://images.smart.wtf/BARACK_OBAMA.png"
                    : agent1 === "BEN_SHAPIRO"
                    ? "https://images.smart.wtf/BEN_SHAPIRO.png"
                    : "https://images.smart.wtf/BEN_SHAPIRO.png";

                const agent2Img =
                  agent2 === "JORDAN_PETERSON"
                    ? "https://images.smart.wtf/JORDAN_PETERSON.png"
                    : agent2 === "JOE_ROGAN"
                    ? "https://images.smart.wtf/JOE_ROGAN.png"
                    : agent2 === "BARACK_OBAMA"
                    ? "https://images.smart.wtf/BARACK_OBAMA.png"
                    : agent2 === "BEN_SHAPIRO"
                    ? "https://images.smart.wtf/BEN_SHAPIRO.png"
                    : "https://images.smart.wtf/BEN_SHAPIRO.png";

                return (
                  <CarouselItem className="flex flex-col items-center justify-center ">
                    <p className="max-w-[75%] text-center font-bold">
                      {video.title}
                    </p>
                    <div className="flex flex-row gap-2 py-2">
                      <Avatar className="border shadow-sm">
                        <AvatarImage src={agent1Img} alt="agent1" />
                      </Avatar>
                      <Avatar className="border shadow-sm">
                        <AvatarImage src={agent2Img} alt="agent2" />
                      </Avatar>
                    </div>

                    <div className="relative overflow-hidden rounded-lg">
                      <div
                        className={`absolute inset-0 h-full rounded-lg bg-black/40 transition-all ${
                          playing === index ? "opacity-0" : ""
                        }`}
                      ></div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          {playing !== index ? (
                            <Button
                              onClick={() => setPlaying(index)}
                              className={`absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform bg-secondary/80`}
                              variant={"outline"}
                            >
                              <Play className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setPlaying(-1)}
                              className={`absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transform bg-secondary/40`}
                              variant={"outline"}
                            >
                              <StopIcon className="size-4" />
                            </Button>
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {playing !== index ? "Play" : "Stop"}
                        </TooltipContent>
                      </Tooltip>

                      <ReactPlayer
                        onProgress={() => {
                          console.log("sup");
                        }}
                        className="rounded-lg border shadow-md transition-all"
                        width={250}
                        height={"100%"}
                        url={url}
                        playing={playing === index}
                      ></ReactPlayer>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={url}
                            className={buttonVariants({
                              variant: "outline",
                              className:
                                "absolute bottom-4 left-4 bg-secondary/80",
                            })}
                            download
                            target="_blank"
                            onClick={() => {
                              toast("Downloading 💥");
                            }}
                          >
                            <DownloadCloud className="size-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="flex w-full flex-row items-center justify-center gap-8 py-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <CarouselPrevious />
                </TooltipTrigger>
                <TooltipContent>Previous Video</TooltipContent>
                <TooltipTrigger asChild>
                  <CarouselNext />
                </TooltipTrigger>
                <TooltipContent>Next Video</TooltipContent>
              </Tooltip>
            </div>
          </Carousel>
        ) : (
          <>
            You have no videos
            <div>
              Click{" "}
              <span
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateVideoOpen(true);
                }}
                className="cursor-pointer font-bold underline transition-all hover:opacity-80"
              >
                here
              </span>{" "}
              to create a video.
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
