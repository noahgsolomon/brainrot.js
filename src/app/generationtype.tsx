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
import { Box, Crown, ScrollText, Skull } from "lucide-react";
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

export default function GenerationType() {
  const [typeSelected, _] = useState<"math" | "brainrot" | "">("");
  const router = useRouter();

  const { videoDetails, setIsOpen, isOpen } = useGenerationType();
  const {
    setIsInQueue,
    setInvalidTopic,
    setVideoInput,
    setIsOpen: setIsCreateVideoOpen,
  } = useCreateVideo();

  const brainrot = videoDetails.brainrot;

  const [generating, setGenerating] = useState(false);

  const userDB = trpc.user.user.useQuery().data?.user;
  const dbUser = trpc.user.user.useQuery();

  const user = useAuth();

  const createVideoMutation = trpc.user.createVideo.useMutation({
    onSuccess: async (data) => {
      if (data?.valid) {
        const uuidVal = uuidv4();
        await fetch("/api/create", {
          method: "POST",
          body: JSON.stringify({
            userId: dbUser.data?.user?.id,
            topic: brainrot.title,
            agent1: brainrot?.agents[0]?.name ?? "JORDAN_PETERSON",
            agent2: brainrot?.agents[1]?.name ?? "BEN_SHAPIRO",
            videoId: uuidVal,
            duration: 1,
            music: brainrot.music,
            background: brainrot.background,
            fps: brainrot.fps,
            aiGeneratedImages: brainrot.assetType === "AI" ? true : false,
            cleanSrt: true,
            credits: brainrot.cost,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        setIsOpen(false);
        setIsCreateVideoOpen(false);
        setGenerating(false);
        toast.success("Video is in queue!");
        setIsInQueue(true);
      } else {
        setIsOpen(false);
        setIsCreateVideoOpen(true);
        setInvalidTopic(true);
        setVideoInput("");
        setGenerating(false);
      }
    },
    onError: (e) => {
      console.log(e);
      setGenerating(false);
    },
  });

  const [searchQueryString, setSearchQueryString] = useState("");

  useEffect(() => {
    const allParamsExist =
      brainrot.title &&
      brainrot.cost &&
      brainrot.assetType &&
      brainrot.duration &&
      brainrot.fps &&
      brainrot.assetType;

    setSearchQueryString(
      `?agent1Id=${encodeURIComponent(
        brainrot.agents[0]?.id!,
      )}&agent2Id=${encodeURIComponent(
        brainrot.agents[1]?.id!,
      )}&agent1Name=${encodeURIComponent(
        brainrot.agents[0]?.name!,
      )}&agent2Name=${encodeURIComponent(
        brainrot.agents[1]?.name!,
      )}&title=${encodeURIComponent(
        brainrot.title,
      )}&credits=${encodeURIComponent(
        brainrot.cost,
      )}&music=${encodeURIComponent(
        brainrot.music ?? "NONE",
      )}&background=${encodeURIComponent(
        brainrot.background ?? "MINECRAFT",
      )}&assetType=${encodeURIComponent(
        brainrot.assetType ?? "GOOGLE",
      )}&duration=${encodeURIComponent(
        brainrot.duration,
      )}&fps=${encodeURIComponent(brainrot.fps)}`,
    );
  }, [brainrot]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className=" max-h-[75%] max-w-[90%] rounded-lg xs:max-w-[425px]">
        <div className="pb-2">
          <div className="relative flex flex-row items-center justify-center gap-8 rounded-lg border bg-accent p-2">
            <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 transform flex-row gap-1">
              <div className="flex flex-row gap-4">
                <Avatar className="border border-border">
                  <AvatarImage
                    width={32}
                    height={32}
                    className="border-3 border-primary"
                    alt={brainrot.agents[0]?.name ?? ""}
                    src={`https://images.smart.wtf/${brainrot.agents[0]?.name}.png`}
                  />
                </Avatar>
                <Avatar className="border border-border">
                  <AvatarImage
                    width={32}
                    height={32}
                    className="border-2 border-border"
                    alt={brainrot.agents[1]?.name ?? ""}
                    src={`https://images.smart.wtf/${brainrot.agents[1]?.name}.png`}
                  />
                </Avatar>
              </div>
            </div>
            <p className="text-center text-xl font-bold">{brainrot.title}</p>
          </div>
        </div>
        <DialogHeader>
          <DialogTitle className="relative ">
            <h3>How would you like to learn?</h3>
          </DialogTitle>
          <DialogDescription>Choose a video style</DialogDescription>
        </DialogHeader>
        <div className="relative flex flex-row gap-4 p-2 md:p-4">
          {!user.userId ? (
            <div className="absolute bottom-0 left-0 right-0 top-0 z-30 flex items-center justify-center rounded-lg bg-black bg-opacity-60 text-secondary dark:text-primary">
              <div className="flex flex-col items-center gap-2">
                <p className="mx-10 text-center text-2xl font-bold">
                  You need to be logged in to create a video!
                </p>
                <div className="flex flex-row items-center gap-2">
                  <Button
                    variant={"darkMode"}
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateVideoOpen(false);
                      router.push(`/login${searchQueryString}`);
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    variant={"brain"}
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
          {user.userId && !userDB?.subscribed && userDB?.credits === 0 ? (
            <div className="absolute bottom-0 left-0 right-0 top-0 z-30 flex items-center justify-center rounded-lg bg-black bg-opacity-60 ">
              <div className="flex max-w-[300px] flex-col gap-0 rounded-lg border border-border bg-card/80 p-4 text-center text-sm shadow-sm">
                <div className="flex flex-col gap-2 font-bold">
                  <div className="flex flex-col gap-1">
                    {" "}
                    go pro to generate videos!
                    <span className="text-xs font-normal italic">
                      (and to support me 🥹🫶)
                    </span>
                  </div>

                  <ProButton searchQueryString={searchQueryString}>
                    <Button
                      className={"flex w-full flex-row items-center gap-2"}
                      variant={"brain"}
                    >
                      GO PRO <Crown className="size-4" />
                    </Button>
                  </ProButton>
                </div>
              </div>
            </div>
          ) : null}

          <Button
            variant={"none"}
            disabled={
              typeSelected === "brainrot" ||
              typeSelected === "math" ||
              generating ||
              !user.userId ||
              !userDB?.subscribed
            }
            onClick={() => {
              // router.push(`/notes/${noteId}`);
              // setIsOpen(false);
              // toast.info("Preparing your note...");
            }}
            className={cn(
              `relative flex h-[250px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-500 bg-red-200 shadow-sm transition-all hover:scale-[101%] hover:opacity-80 active:scale-[99%] dark:border-red-900/80 dark:bg-red-400/80`,
            )}
          >
            <Badge variant={"math"} className="absolute -right-2 -top-2 z-10">
              Coming Soon
            </Badge>
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30"></div>
            <p className="text-xl font-bold text-secondary/80 dark:text-primary/80">
              Math Style
            </p>
            <Box className="h-[64px] w-[64px] text-secondary/60 dark:text-primary/60 " />
          </Button>
          <Button
            variant={"none"}
            disabled={
              typeSelected === "brainrot" ||
              typeSelected === "math" ||
              generating ||
              !user.userId ||
              !userDB?.subscribed
            }
            onClick={() => {
              setGenerating(true);
              createVideoMutation.mutate({
                title: brainrot.title,
                agent1: brainrot.agents[0]?.id ?? 0,
                agent2: brainrot.agents[1]?.id ?? 1,
                cost: brainrot.cost,
                remainingCredits: userDB?.credits ?? 0,
              });
            }}
            className={cn(
              `flex h-[250px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue bg-lightBlue shadow-sm transition-all hover:scale-[101%] hover:opacity-80 active:scale-[99%]`,
            )}
          >
            <p className="text-xl font-bold text-secondary/80 dark:text-primary/80 ">
              Brainrot Style
            </p>
            <Skull className="h-[64px] w-[64px] text-secondary/60 dark:text-primary/60 " />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
