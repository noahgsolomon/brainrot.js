"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useYourVideos } from "./useyourvideos";
import { useCreateVideo } from "./usecreatevideo";
import { useTRPC } from "@/trpc/client";
import { Suspense } from "react";
import { DownloadCloud, Loader2, Play, Pause, Music } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import ReactPlayer from "react-player";
import { SpeakerAvatarStack } from "@/components/speaker-avatar-stack";
import { StopIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import XIcon from "@/components/svg/XIcon";
import { useAudioStore } from "@/store/audioStore";
import Image from "next/image";
import {
  formatSpeakerNames,
  serializeSpeakerNamesForQueryParam,
} from "@/lib/brainrot-speakers";

export default function YourVideos({ visible = false }: { visible?: boolean }) {
  const trpc = useTRPC();
  const { isOpen, setIsOpen } = useYourVideos();
  const audioStore = useAudioStore();

  const userVideosQuery = useQuery(trpc.user.userVideos.queryOptions());
  const userRapAudioQuery = useQuery(trpc.user.userRapAudio.queryOptions());

  const videos = userVideosQuery.data?.videos ?? [];
  const rapAudio = userRapAudioQuery.data?.rapAudio ?? [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {/* Videos Section */}
          {userVideosQuery.isFetched && videos.length > 0 ? (
            <div className="flex flex-col items-center justify-center">
              <h3 className="mb-4 text-xl font-bold">Your Videos</h3>
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
                  <div key={video.id} className="w-full">
                    {index > 0 && <div className="my-6 w-full border-b"></div>}
                    <p className={`max-w-[75%] text-center font-bold`}>
                      {video.title}
                    </p>
                    <div className="flex flex-row gap-2 py-2">
                      <SpeakerAvatarStack speakers={speakers} />
                    </div>

                    <div className="relative overflow-hidden rounded-lg">
                      <Suspense fallback={<Loader2 className="size-6" />}>
                        <video
                          src={url}
                          poster={video.thumbnail ?? undefined}
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
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
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
