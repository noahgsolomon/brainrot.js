"use client";

import { useQuery } from "@tanstack/react-query";
import XIcon from "@/components/svg/XIcon";
import { SpeakerAvatarStack } from "@/components/speaker-avatar-stack";
import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  formatSpeakerNames,
  serializeSpeakerNamesForQueryParam,
} from "@/lib/brainrot-speakers";
import { useTRPC } from "@/trpc/client";
import { DownloadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

export default function Page() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);

  const videosQuery = useQuery(trpc.user.getVideos.queryOptions({ page }));

  const [videos, setVideos] = useState<
      {
        id: number;
        user_id: number;
        agents: string[];
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
    const nextVideos = videosQuery.data?.videos ?? [];

    if (nextVideos.length === 0) {
      return;
    }

    setVideos((currentVideos) => {
      if (currentVideos.length === 0) {
        return nextVideos;
      }

      if (nextVideos[0]?.url !== currentVideos[0]?.url) {
        return [...currentVideos, ...nextVideos];
      }

      return currentVideos;
    });
  }, [videosQuery.data?.videos]);

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
              const url = video.url;
              const speakers =
                video.agents.length > 0
                  ? video.agents
                  : [video.agent1, video.agent2].filter(Boolean);
              const renderPath = video.url
                .replace(
                  "https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/",
                  "",
                )
                .replace("/out.mp4", "");
              const renderUrlParams = new URLSearchParams({
                title: video.title,
              });
              const serializedSpeakers =
                serializeSpeakerNamesForQueryParam(speakers);

              if (serializedSpeakers) {
                renderUrlParams.set("agents", serializedSpeakers);
              }

              if (video.agent1) {
                renderUrlParams.set("agent1", video.agent1);
              }

              if (video.agent2) {
                renderUrlParams.set("agent2", video.agent2);
              }

              const shareText = `${video.title} explained by ${formatSpeakerNames(
                speakers,
              )} AI with @brainrotjs \n\nhttps://brainrotjs.com/renders/${renderPath}?${renderUrlParams.toString()}`;

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
                      <SpeakerAvatarStack speakers={speakers} />
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
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
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
