"use client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { Box, Crown, ScrollText, Skull, Mic, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGenerationType } from "./usegenerationtype";
//@ts-ignore
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@clerk/nextjs";
import { useCreateVideo } from "./usecreatevideo";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import ProButton from "./ProButton";
import BuyCreditsDialog from "./buy-credits-dialog";

export default function GenerationType() {
  const [typeSelected, _] = useState<
    "math" | "brainrot" | "podcast" | "monologue" | "rap" | ""
  >("");
  const router = useRouter();

  const { videoDetails, setVideoDetails, setIsOpen, isOpen } =
    useGenerationType();
  const {
    setInvalidTopic,
    setVideoInput,
    setIsOpen: setIsCreateVideoOpen,
  } = useCreateVideo();

  const userDB = trpc.user.user.useQuery().data?.user;

  const user = useAuth();

  const [searchQueryString, setSearchQueryString] = useState("");

  useEffect(() => {
    const allParamsExist =
      videoDetails.title &&
      videoDetails.cost &&
      videoDetails.assetType &&
      videoDetails.duration &&
      videoDetails.fps &&
      videoDetails.assetType;

    setSearchQueryString(
      `?agent1Id=${encodeURIComponent(
        videoDetails.agents[0]?.id!,
      )}&agent2Id=${encodeURIComponent(
        videoDetails.agents[1]?.id!,
      )}&agent1Name=${encodeURIComponent(
        videoDetails.agents[0]?.name!,
      )}&agent2Name=${encodeURIComponent(
        videoDetails.agents[1]?.name!,
      )}&title=${encodeURIComponent(
        videoDetails.title,
      )}&credits=${encodeURIComponent(
        videoDetails.cost,
      )}&music=${encodeURIComponent(
        videoDetails.music ?? "NONE",
      )}&background=${encodeURIComponent(
        videoDetails.background ?? "MINECRAFT",
      )}&assetType=${encodeURIComponent(
        videoDetails.assetType ?? "GOOGLE",
      )}&duration=${encodeURIComponent(
        videoDetails.duration,
      )}&fps=${encodeURIComponent(videoDetails.fps)}`,
    );
  }, [videoDetails]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[75%] max-w-[90%] rounded-lg xs:max-w-[800px]">
        {/* <div className="pb-2">
          <div className="relative flex flex-row items-center justify-center gap-8 rounded-lg border bg-accent p-2">
            <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 transform flex-row gap-1">
              <div className="flex flex-row gap-4">
                {user.userId && (
                  <Avatar>
                    <AvatarImage
                      width={32}
                      height={32}
                      className="border-3 border-primary"
                      alt={videoDetails.agents[0]?.name ?? ""}
                      src={`https://images.smart.wtf/${videoDetails.agents[0]?.name}.png`}
                    />
                  </Avatar>
                )}
                <Avatar className="border border-border">
                  <AvatarImage
                    width={32}
                    height={32}
                    className="border-3 border-primary"
                    alt={videoDetails.agents[1]?.name ?? ""}
                    src={`https://images.smart.wtf/${videoDetails.agents[1]?.name}.png`}
                  />
                </Avatar>
              </div>
            </div>
            <p className="text-center text-xl font-bold">{videoDetails.title}</p>
          </div>
        </div> */}
        <DialogHeader>
          <DialogTitle className="relative ">
            <h3>Choose a video style</h3>
          </DialogTitle>
          <DialogDescription>
            Choose a video style to get started
          </DialogDescription>
        </DialogHeader>
        <div className="relative grid grid-cols-1 gap-4 p-2 sm:grid-cols-2 sm:p-4">
          {!user.userId ? (
            <div className="absolute bottom-0 left-0 right-0 top-0 z-30 flex items-center justify-center rounded-lg bg-black bg-opacity-60 text-secondary dark:text-primary">
              <div className="flex flex-col items-center gap-2">
                <p className="mx-10 text-center text-2xl font-bold">
                  You need to be logged in to create a video!
                </p>
                <div className="flex flex-row items-center gap-2">
                  <Button
                    variant={"outline"}
                    className="text-lg"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateVideoOpen(false);
                      router.push(`/login${searchQueryString}`);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant={"pink"}
                    className="text-lg"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateVideoOpen(false);
                      router.push(`/signup${searchQueryString}`);
                    }}
                  >
                    Signup
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {/* {user.userId && !userDB?.subscribed && (userDB?.credits ?? 0) <= 0 ? (
            <div className="absolute bottom-0 left-0 right-0 top-0 z-30 flex items-center justify-center rounded-lg bg-black bg-opacity-60 ">
              <div className="flex max-w-[300px] flex-col gap-0 rounded-lg border border-border bg-card/80 p-4 text-center text-sm shadow-sm">
                <div className="flex flex-col gap-2 font-bold">
                  <div className="flex flex-col gap-1">
                    Go Pro or Buy Credits to Generate Videos!
                  </div>

                  <ProButton searchQueryString={searchQueryString}>
                    <Button
                      data-action="subscribe"
                      className={
                        "flex w-full flex-row items-center gap-2 text-secondary dark:text-primary"
                      }
                      variant={"pink"}
                    >
                      GO PRO <Crown className="size-4" />
                    </Button>
                  </ProButton>
                  <BuyCreditsDialog searchQueryString={searchQueryString} />
                </div>
              </div>
            </div>
          ) : null} */}

          <div className="relative md:flex-1">
            <div
              className={cn(
                `relative flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 shadow-md transition-all hover:scale-[101%] hover:shadow-lg active:scale-[99%] dark:border-gray-700`,
              )}
            >
              <div className="absolute inset-0 z-10 bg-black/50"></div>
              <div className="absolute inset-0 z-10 bg-black/40"></div>
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src="/podcast-style.png"
                  alt="Podcast Style"
                  fill
                  className="object-cover opacity-70"
                />
              </div>
              <p className="text-shadow-[0_1px_3px_rgba(0,0,0,1)] relative z-10 px-4 text-center text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                Podcast Style
              </p>
            </div>
            <Badge
              variant={"math"}
              className="absolute -right-2 -top-2 z-20 rounded-full px-3 py-1"
            >
              Coming Soon
            </Badge>
          </div>

          <div className="relative md:flex-1">
            <Button
              variant={"none"}
              disabled={
                typeSelected === "brainrot" ||
                typeSelected === "podcast" ||
                typeSelected === "monologue" ||
                typeSelected === "rap" ||
                !user.userId
              }
              onClick={() => {
                setIsOpen(false);
                setIsCreateVideoOpen(true);
                setInvalidTopic(false);
                setVideoInput("");
                setVideoDetails({
                  ...videoDetails,
                  mode: "brainrot",
                });
              }}
              className={cn(
                `relative flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 shadow-md transition-all hover:scale-[101%] hover:shadow-lg active:scale-[99%] dark:border-gray-700`,
              )}
            >
              <div className="absolute inset-0 z-10 bg-black/40"></div>
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src="/brainrot-style.png"
                  alt="Brainrot Style"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-shadow-[0_1px_3px_rgba(0,0,0,1)] relative z-10 px-4 text-center text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                Brainrot Style
              </p>
            </Button>
          </div>

          <div className="relative md:flex-1">
            <div
              className={cn(
                `relative flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 shadow-md transition-all hover:scale-[101%] hover:shadow-lg active:scale-[99%] dark:border-gray-700`,
              )}
            >
              <div className="absolute inset-0 z-10 bg-black/50"></div>
              <div className="absolute inset-0 z-10 bg-black/40"></div>
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src="/monologue-style.png"
                  alt="Monologue Style"
                  fill
                  className="object-cover opacity-70"
                />
              </div>
              <p className="text-shadow-[0_1px_3px_rgba(0,0,0,1)] relative z-10 px-4 text-center text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                Monologue Style
              </p>
            </div>
            <Badge
              variant={"math"}
              className="absolute -right-2 -top-2 z-20 rounded-full px-3 py-1"
            >
              Coming Soon
            </Badge>
          </div>

          <div className="relative md:flex-1">
            <Button
              variant={"none"}
              disabled={
                typeSelected === "brainrot" ||
                typeSelected === "podcast" ||
                typeSelected === "monologue" ||
                typeSelected === "rap" ||
                !user.userId
              }
              onClick={() => {
                setIsOpen(false);
                setIsCreateVideoOpen(true);
                setInvalidTopic(false);
                setVideoInput("");
                setVideoDetails({
                  ...videoDetails,
                  mode: "rap",
                });
              }}
              className={cn(
                `relative flex h-[250px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 shadow-md transition-all hover:scale-[101%] hover:shadow-lg active:scale-[99%] dark:border-gray-700`,
              )}
            >
              <div className="absolute inset-0 z-10 bg-black/40"></div>
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src="/rap-style.png"
                  alt="Rap Style"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-shadow-[0_1px_3px_rgba(0,0,0,1)] relative z-10 px-4 text-center text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                Rap Style
              </p>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
