"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useYourVideos } from "./useyourvideos";
import { useCreateVideo } from "./usecreatevideo";
import { trpc } from "@/trpc/client";
import { Suspense, useEffect, useState } from "react";
import { DownloadCloud, Loader2, Play, Pause, Music } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ReactPlayer from "react-player";
import { Avatar } from "@/components/ui/avatar";
import { AvatarImage } from "@radix-ui/react-avatar";
import { StopIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import XIcon from "@/components/svg/XIcon";
import { useAudioStore } from "@/store/audioStore";
import Image from "next/image";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const { isOpen, setIsOpen, refetchVideos, setRefetchVideos } =
    useYourVideos();
  const audioStore = useAudioStore();

  const userVideosQuery = trpc.user.userVideos.useQuery();

  useEffect(() => {
    if (refetchVideos) {
      userVideosQuery.refetch();
      setRefetchVideos(false);
    }
  }, [refetchVideos]);

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
  >(userVideosQuery.data?.videos ?? []);

  const userRapAudioQuery = trpc.user.userRapAudio.useQuery();
  const [rapAudio, setRapAudio] = useState<
    {
      id: number;
      user_id: number;
      rapper: string;
      song_name: string;
      artist_name: string;
      url: string;
      video_id: string;
    }[]
  >(userRapAudioQuery.data?.rapAudio ?? []);

  useEffect(() => {
    setRapAudio(userRapAudioQuery.data?.rapAudio ?? []);
  }, [userRapAudioQuery.data?.rapAudio]);

  useEffect(() => {
    setVideos(userVideosQuery.data?.videos ?? []);
  }, [userVideosQuery.data?.videos]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {/* Videos Section */}
          {userVideosQuery.isFetched && videos.length > 0 ? (
            <div className="flex flex-col items-center justify-center">
              <h3 className="mb-4 text-xl font-bold">Your Videos</h3>
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
                  <div key={video.id} className="w-full">
                    {index > 0 && <div className="my-6 w-full border-b"></div>}
                    <p className={`max-w-[75%] text-center font-bold`}>
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
                      <Suspense fallback={<Loader2 className="size-6" />}>
                        <video
                          src={url}
                          loop
                          playsInline
                          controls
                          className="rounded-xl border shadow-sm"
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
                        })}
                      >
                        Share on <XIcon className="size-4 fill-secondary" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Rap Audio Section */}
          {userRapAudioQuery.isFetched && rapAudio.length > 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center">
              {videos.length > 0 && (
                <div className="my-6 w-full border-b border-dashed"></div>
              )}
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
                Your Rap Tracks <Music className="h-5 w-5" />
              </h3>
              {rapAudio.map((audio, index) => {
                const rapperName = audio.rapper;
                const songName = audio.song_name;
                const artistName = audio.artist_name;
                const url = audio.url;
                const audioId = `rap-${audio.video_id}`;

                // Get rapper image
                const rapperImg =
                  rapperName === "SPONGEBOB"
                    ? "/img/SPONGEBOB.png"
                    : rapperName === "BARACK_OBAMA"
                    ? "/img/BARACK_OBAMA.png"
                    : rapperName === "DONALD_TRUMP"
                    ? "/img/DONALD_TRUMP.png"
                    : "/img/SPONGEBOB.png";

                return (
                  <div key={audio.id} className="w-full">
                    {index > 0 && <div className="my-6 w-full border-b"></div>}
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-col items-center">
                        <p className="text-center text-lg font-bold">
                          {songName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Original by {artistName}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="relative overflow-hidden rounded-full border-2 border-blue/30 bg-blue/10 p-1">
                          <Image
                            src={rapperImg}
                            width={60}
                            height={60}
                            alt={rapperName}
                            className="h-[60px] w-[60px] rounded-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-medium">
                            {rapperName
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0) + word.slice(1).toLowerCase(),
                              )
                              .join(" ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rapper
                          </p>
                        </div>
                      </div>

                      <div className="flex w-full items-center gap-4 rounded-lg border bg-secondary/10 p-4">
                        <button
                          onClick={() => {
                            if (audioStore.currentTrack?.id === audioId) {
                              audioStore.toggle();
                            } else {
                              const track = {
                                id: audioId,
                                title: songName,
                                subtitle: `${rapperName
                                  .split("_")
                                  .map(
                                    (word) =>
                                      word.charAt(0) +
                                      word.slice(1).toLowerCase(),
                                  )
                                  .join(" ")} - Cover of ${artistName}`,
                                src: url,
                              };
                              audioStore.play(track);
                            }
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/20 transition-all hover:scale-[1.05] hover:bg-blue/30 active:scale-[0.95]"
                        >
                          {audioStore.currentTrack?.id === audioId &&
                          audioStore.isPlaying ? (
                            <Pause className="h-6 w-6 text-blue" />
                          ) : (
                            <Play className="h-6 w-6 text-blue" />
                          )}
                        </button>
                        <div className="flex flex-1 flex-col">
                          <span className="font-medium">{songName}</span>
                          <span className="text-xs text-muted-foreground">
                            {rapperName
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0) + word.slice(1).toLowerCase(),
                              )
                              .join(" ")}{" "}
                            - Cover of {artistName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-row items-center gap-2">
                        <Link
                          target="_blank"
                          href={url}
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
                            `Check out this AI rap cover of "${songName}" by ${artistName}, performed by ${rapperName
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0) + word.slice(1).toLowerCase(),
                              )
                              .join(" ")} AI with @brainrotjs \n\n${url}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            className: "mt-2 flex w-[146px] flex-row gap-2",
                          })}
                        >
                          Share on <XIcon className="size-4 fill-secondary" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* No content message */}
          {userVideosQuery.isFetched &&
            videos.length === 0 &&
            rapAudio.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Music className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">You have no content yet</p>
                <p className="text-sm text-muted-foreground">
                  Create videos or rap tracks to see them here
                </p>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
