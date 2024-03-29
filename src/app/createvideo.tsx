"use client";

import { Button } from "@/components/ui/button";
import { BookMarked, Flame, Wand, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCreateVideo } from "./usecreatevideo";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";
//@ts-ignore
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { pendingVideos } from "@/server/db/schemas/users/schema";

export default function CreateVideo({
  visible = false,
}: {
  visible?: boolean;
}) {
  const user = useAuth();

  const videoStatus = trpc.user.videoStatus.useQuery();

  const [videoInput, setVideoInput] = useState("");
  const [agent, setAgent] = useState<
    {
      name: "JORDAN_PETERSON" | "BEN_SHAPIRO" | "JOE_ROGAN" | "BARACK_OBAMA";
      id: number;
    }[]
  >([]);
  const [recommendedSelect, setRecommendedSelect] = useState(-1);
  const [invalidTopic, setInvalidTopic] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recommendedTopics] = useState<string[]>([
    "Covariance Matrix",
    "Alien Invasion",
    "Fall of Roman Empire",
  ]);
  const router = useRouter();

  const dbUser = trpc.user.user.useQuery();

  const { isOpen, setIsOpen, setIsInQueue } = useCreateVideo();

  const createVideoMutation = trpc.user.createVideo.useMutation({
    onSuccess: async (data) => {
      if (data?.valid) {
        const uuidVal = uuidv4();
        await fetch("/api/create", {
          method: "POST",
          body: JSON.stringify({
            userId: dbUser.data?.user?.id,
            topic:
              videoInput === ""
                ? recommendedTopics[recommendedSelect]
                : videoInput,
            agent1: agent[0]?.name ?? "JORDAN_PETERSON",
            agent2: agent[1]?.name ?? "BEN_SHAPIRO",
            videoId: uuidVal,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        setIsOpen(false);
        setGenerating(false);
        toast.success("Video is in queue!");
        setIsInQueue(true);
      } else {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className=" rounded-lg sm:max-w-[425px]">
        {!user.userId && (
          <div className="absolute bottom-0 left-0 right-0 top-0 z-10 flex items-center justify-center rounded-lg bg-black bg-opacity-50 text-secondary dark:text-primary">
            <div className="flex flex-col items-center gap-2">
              <p className="mx-10 text-center text-2xl font-bold">
                You need to be logged in to create a video!
              </p>
              <div className="flex flex-row items-center gap-2">
                <Button
                  className="bg-blue/80 text-secondary hover:bg-blue/70 dark:text-primary"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login");
                  }}
                >
                  Login
                </Button>
                <Button
                  className="bg-red-500/80 text-secondary hover:bg-red-500/70 dark:text-primary"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/signup");
                  }}
                >
                  Signup
                </Button>
              </div>
            </div>
          </div>
        )}
        <div></div>
        <DialogHeader>
          <DialogTitle className="relative ">
            <h3>Generate Video</h3>
            <XIcon
              className="absolute right-2 top-2 h-4 w-4 cursor-pointer transition-all hover:opacity-80"
              onClick={() => setIsOpen(false)}
            />
          </DialogTitle>
          <DialogDescription>
            Generate a video on whatever topic you desire!
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="flex items-center gap-1 pb-2">
            <h4>1.{")"} Choose a topic.</h4>
            <BookMarked className="h-4 w-4 text-blue" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className={`transition-all ${
                recommendedSelect === 0 ? "border border-primary" : ""
              }`}
              onClick={() => {
                setRecommendedSelect(0);
                setInvalidTopic(false);
              }}
              size={"sm"}
              variant={"secondary"}
            >
              Covariance Matrix
            </Button>
            <Button
              className={`transition-all ${
                recommendedSelect === 1 ? "border border-primary" : ""
              }`}
              onClick={() => {
                setRecommendedSelect(1);
                setInvalidTopic(false);
              }}
              size={"sm"}
              variant={"secondary"}
            >
              Alien Invasion
            </Button>
            <Button
              className={`transition-all ${
                recommendedSelect === 2 ? "border border-primary" : ""
              }`}
              onClick={() => {
                setRecommendedSelect(2);
                setInvalidTopic(false);
              }}
              size={"sm"}
              variant={"secondary"}
            >
              Fall of Roman Empire
            </Button>
          </div>
          <div className="flex flex-col justify-center gap-1 py-4">
            <Input
              id="name"
              placeholder="// Random topic"
              className="col-span-3"
              value={videoInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setGenerating(true);
                  createVideoMutation.mutate({
                    title:
                      (videoInput === ""
                        ? recommendedTopics[recommendedSelect]
                        : videoInput) ?? "the future of the world",
                    agent1: agent[0]?.id ?? 0,
                    agent2: agent[1]?.id ?? 1,
                  });
                }
              }}
              onChange={(e) => {
                setVideoInput(e.target.value);
                setRecommendedSelect(-1);
                setInvalidTopic(false);
              }}
            />
            <p
              className={`${
                invalidTopic ? "" : "hidden"
              } text-sm text-destructive`}
            >
              Not a valid topic
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <h4>2.{")"} Choose your 2 fighters!</h4>
            <Flame className="h-4 w-4 text-destructive" />
          </div>

          <div className="flex flex-wrap gap-2">
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "JORDAN_PETERSON")
                    ? "border border-blue"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "JORDAN_PETERSON")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isJordanPetersonPresent = currentAgents.some(
                    (agent) => agent.name === "JORDAN_PETERSON",
                  );

                  if (isJordanPetersonPresent) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "JORDAN_PETERSON",
                    );
                  } else {
                    return [
                      ...currentAgents,
                      { name: "JORDAN_PETERSON", id: 1 },
                    ];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                  agent.some((a) => a.name === "JORDAN_PETERSON")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-10 scale-[110%]"
                src={"https://images.smart.wtf/JORDAN_PETERSON.png"}
                width={75}
                height={75}
                alt="jordan"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "BEN_SHAPIRO")
                    ? "border border-mrburns"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "BEN_SHAPIRO")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isBenShapiro = currentAgents.some(
                    (agent) => agent.name === "BEN_SHAPIRO",
                  );

                  if (isBenShapiro) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "BEN_SHAPIRO",
                    );
                  } else {
                    return [...currentAgents, { name: "BEN_SHAPIRO", id: 2 }];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                  agent.some((a) => a.name === "BEN_SHAPIRO")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-10 scale-[110%]"
                src={"https://images.smart.wtf/BEN_SHAPIRO.png"}
                width={75}
                height={75}
                alt="mrburns"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "JOE_ROGAN")
                    ? "border border-bender"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "JOE_ROGAN")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isJoeRogan = currentAgents.some(
                    (agent) => agent.name === "JOE_ROGAN",
                  );

                  if (isJoeRogan) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "JOE_ROGAN",
                    );
                  } else {
                    return [...currentAgents, { name: "JOE_ROGAN", id: 3 }];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                  agent.some((a) => a.name === "JOE_ROGAN")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-10 scale-[125%]"
                src={"https://images.smart.wtf/JOE_ROGAN.png"}
                width={75}
                height={75}
                alt="bender"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "BARACK_OBAMA")
                    ? "border border-patrick"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "BARACK_OBAMA")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isBarackObama = currentAgents.some(
                    (agent) => agent.name === "BARACK_OBAMA",
                  );

                  if (isBarackObama) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "BARACK_OBAMA",
                    );
                  } else {
                    return [...currentAgents, { name: "BARACK_OBAMA", id: 4 }];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                  agent.some((a) => a.name === "BARACK_OBAMA")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-0 scale-[120%]"
                src={"https://images.smart.wtf/BARACK_OBAMA.png"}
                width={75}
                height={75}
                alt="barack"
              />
            </div>
          </div>
        </div>
        {videoStatus.data?.videos !== null && (
          <p className="text-sm text-destructive/60">
            Can't generate another video while one is already pending
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={
              agent.length !== 2 ||
              (videoInput === "" && recommendedSelect === -1) ||
              generating ||
              videoStatus.data?.videos !== null
            }
            className="flex items-center gap-2"
            onClick={() => {
              setGenerating(true);
              createVideoMutation.mutate({
                title:
                  (videoInput === ""
                    ? recommendedTopics[recommendedSelect]
                    : videoInput) ?? "the future of the world",
                agent1: agent[0]?.id ?? 0,
                agent2: agent[1]?.id ?? 1,
              });
            }}
          >
            {generating ? "Generating..." : "Generate"}
            <Wand className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
