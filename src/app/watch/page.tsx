"use client";

import XIcon from "@/components/svg/XIcon";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { trpc } from "@/trpc/client";
import { DownloadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

export default function Page() {
  const [page, setPage] = useState(1);

  const videosQuery = trpc.user.getVideos.useQuery({ page });

  const [videos, setVideos] = useState<
    {
      id: number;
      user_id: number;
      agent1: string;
      agent2: string;
      title: string;
      url: string;
      videoId: string;
    }[]
  >([]);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (videosQuery.data?.videos) {
      if (
        videos.length > 0 &&
        videosQuery.data?.videos[0]?.url !== videos[0]?.url
      ) {
        setVideos((prev) => [...prev, ...videosQuery.data?.videos]);
      } else if (videos.length === 0) {
        setVideos((prev) => [...prev, ...videosQuery.data?.videos]);
      }
    }
  }, [videosQuery.isFetching]);

  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
    });

    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((video) => {
      observer.observe(video);
    });

    return () => {
      videoElements.forEach((video) => {
        observer.unobserve(video);
      });
    };
  }, [videos]);

  const handleNext = () => {
    api?.scrollNext();
  };

  useEffect(() => {
    if (!canScrollNext) {
      setPage((prev) => prev + 1);
    }
  }, [canScrollNext]);

  useEffect(() => {
    if (api) {
      const checkCanScrollNext = () => {
        setCanScrollNext(api.canScrollNext());
      };

      console.log(api.canScrollNext());

      api.on("select", checkCanScrollNext);
      api.on("reInit", checkCanScrollNext);

      checkCanScrollNext();

      return () => {
        api.off("select", checkCanScrollNext);
        api.off("reInit", checkCanScrollNext);
      };
    }
  }, [api]);

  useEffect(() => console.log(canScrollNext));

  return (
    <div>
      <div className="flex flex-col items-center justify-center pt-16">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
          }}
          orientation="vertical"
          className="w-full"
        >
          <CarouselContent className="h-[750px]">
            {videos.map((video, index) => {
              const agent1 = video.agent1;

              const agent2 = video.agent2;

              const url = video.url;

              const agent1Img =
                agent1 === "JORDAN_PETERSON"
                  ? "/img/JORDAN_PETERSON.png"
                  : agent1 === "JOE_ROGAN"
                  ? "/img/JOE_ROGAN.png"
                  : agent1 === "BARACK_OBAMA"
                  ? "/img/BARACK_OBAMA.png"
                  : agent1 === "BEN_SHAPIRO"
                  ? "/img/BEN_SHAPIRO.png"
                  : agent1 === "DONALD_TRUMP"
                  ? "/img/DONALD_TRUMP.png"
                  : agent1 === "KAMALA_HARRIS"
                  ? "/img/KAMALA_HARRIS.png"
                  : agent1 === "JOE_BIDEN"
                  ? "/img/JOE_BIDEN.png"
                  : agent1 === "ANDREW_TATE"
                  ? "/img/ANDREW_TATE.png"
                  : "/img/BEN_SHAPIRO.png";

              const agent2Img =
                agent2 === "JORDAN_PETERSON"
                  ? "/img/JORDAN_PETERSON.png"
                  : agent2 === "JOE_ROGAN"
                  ? "/img/JOE_ROGAN.png"
                  : agent2 === "BARACK_OBAMA"
                  ? "/img/BARACK_OBAMA.png"
                  : agent2 === "BEN_SHAPIRO"
                  ? "/img/BEN_SHAPIRO.png"
                  : agent2 === "DONALD_TRUMP"
                  ? "/img/DONALD_TRUMP.png"
                  : agent2 === "KAMALA_HARRIS"
                  ? "/img/KAMALA_HARRIS.png"
                  : agent2 === "JOE_BIDEN"
                  ? "/img/JOE_BIDEN.png"
                  : agent2 === "ANDREW_TATE"
                  ? "/img/ANDREW_TATE.png"
                  : "/img/BEN_SHAPIRO.png";

              return (
                <CarouselItem key={video.id}>
                  <div className="flex h-full flex-col items-center justify-center">
                    {index > 0 && <div className="w-full"></div>}
                    <p
                      className={`max-w-[80%] text-center font-bold md:max-w-[400px]`}
                    >
                      {video.title}
                    </p>
                    <div className="flex w-full flex-row justify-center gap-2 py-2">
                      <Avatar className="border shadow-sm">
                        <AvatarImage src={agent1Img} alt="agent1" />
                      </Avatar>
                      <Avatar className="border shadow-sm">
                        <AvatarImage src={agent2Img} alt="agent2" />
                      </Avatar>
                    </div>

                    <div className="relative overflow-hidden rounded-lg">
                      <Suspense fallback={<Loader2 className="size-6" />}>
                        <video
                          src={url}
                          className={`rounded-lg shadow-md transition-all`}
                          width={300}
                          height={"100%"}
                          controls
                        ></video>
                      </Suspense>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                      <Link
                        target="_blank"
                        href={video.url}
                        download
                        className={buttonVariants({
                          variant: "outline",
                          className: "mt-2 flex w-[146px] flex-row gap-2",
                        })}
                      >
                        Download <DownloadCloud className="size-4" />
                      </Link>
                      <Link
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `${video.title} explained by ${video.agent1
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0) + word.slice(1).toLowerCase(),
                            )
                            .join(" ")} AI and ${video.agent2
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0) + word.slice(1).toLowerCase(),
                            )
                            .join(
                              " ",
                            )} AI with @brainrotjs \n\nhttps://brainrotjs.com/renders/${video.url
                            .replace(
                              "https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/",
                              "",
                            )
                            .replace(
                              "/out.mp4",
                              "",
                            )}?title=${encodeURIComponent(
                            video.title,
                          )}&agent1=${video.agent1}&agent2=${video.agent2}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({
                          className: "mt-2 flex w-[146px] flex-row gap-2",
                          variant: "outline",
                        })}
                      >
                        Share on <XIcon className="size-4 fill-primary" />
                      </Link>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="fixed bottom-8 left-0 right-0 flex justify-center space-x-4">
            <CarouselPrevious variant={"default"} />
            <CarouselNext
              disabled={!canScrollNext}
              variant={"default"}
              onClick={handleNext}
            />
          </div>
        </Carousel>
      </div>
    </div>
  );
}
