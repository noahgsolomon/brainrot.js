"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertTriangle,
  BookMarked,
  Crown,
  Film,
  Flame,
  Info,
  Music,
  Save,
  Wand,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCreateVideo } from "./usecreatevideo";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";
//@ts-ignore
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { DialogClose, DialogTrigger } from "@radix-ui/react-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import ProButton from "./ProButton";

export default function CreateVideo({
  visible = false,
}: {
  visible?: boolean;
}) {
  const user = useAuth();

  const userDB = trpc.user.user.useQuery().data?.user;

  const videoStatus = trpc.user.videoStatus.useQuery();

  const [videoInput, setVideoInput] = useState("");
  const [agent, setAgent] = useState<
    {
      name:
        | "JORDAN_PETERSON"
        | "BEN_SHAPIRO"
        | "JOE_ROGAN"
        | "BARACK_OBAMA"
        | "DONALD_TRUMP"
        | "MARK_ZUCKERBERG"
        | "LIL_YACHTY"
        | "JOE_BIDEN";
      id: number;
    }[]
  >([]);
  const [background, setBackground] = useState<
    "TRUCK" | "MINECRAFT" | "GTA" | null
  >(null);
  const [music, setMusic] = useState<
    | "FLUFFING_A_DUCK"
    | "MONKEYS_SPINNING_MONKEYS"
    | "WII_SHOP_CHANNEL_TRAP"
    | "NONE"
    | null
  >(null);
  const [fps, setFps] = useState<number | null>(null);
  const [recommendedSelect, setRecommendedSelect] = useState(-1);
  const [duration, setDuration] = useState<number | null>(null);
  const [assetType, setAssetType] = useState<"AI" | "GOOGLE" | null>(null);
  const [credits, setCredits] = useState(10);

  const [invalidTopic, setInvalidTopic] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recommendedTopics] = useState<string[]>([
    "Covariance Matrix",
    "Alien Invasion",
    "Fall of Roman Empire",
  ]);
  const router = useRouter();

  useEffect(() => {
    let value = 10;
    if (assetType === "AI") {
      value += 5;
    }
    if (duration) {
      value += 10 * (duration - 1) * (fps && fps > 20 ? fps / 30 : 1);
    }
    if (fps) {
      value += fps === 30 ? 3 : fps === 50 ? 9 : fps === 60 ? 12 : 0;
    }
    setCredits(Math.min(Math.round(value), 60));
  }, [fps, duration, assetType]);

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
            duration: duration,
            music: music,
            background: background,
            fps: fps,
            aiGeneratedImages: assetType === "AI" ? true : false,
            cleanSrt: true,
            credits: credits,
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
      <DialogContent className=" max-h-[75%] max-w-[90%] rounded-lg xs:max-w-[425px]">
        {!user.userId && (
          <div className="absolute bottom-0 left-0 right-0 top-0 z-30 flex items-center justify-center rounded-lg bg-black bg-opacity-60 text-secondary dark:text-primary">
            <div className="flex flex-col items-center gap-2">
              <p className="mx-10 text-center text-2xl font-bold">
                You need to be logged in to create a video!
              </p>
              <div className="flex flex-row items-center gap-2">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/login");
                  }}
                >
                  Login
                </Button>
                <Button
                  variant={"brain"}
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
          {/* <div className="hidden flex-wrap gap-2 sm:flex">
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
          </div> */}
          <div className="flex flex-col justify-center gap-1 py-4">
            <Textarea
              spellCheck
              id="name"
              placeholder="// Random topic"
              className="col-span-3"
              value={videoInput}
              maxLength={500}
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
                  agent.some((a) => a.name === "DONALD_TRUMP")
                    ? "border border-red-500"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "DONALD_TRUMP")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isJordanPetersonPresent = currentAgents.some(
                    (agent) => agent.name === "DONALD_TRUMP",
                  );

                  if (isJordanPetersonPresent) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "DONALD_TRUMP",
                    );
                  } else {
                    return [...currentAgents, { name: "DONALD_TRUMP", id: 1 }];
                  }
                });
              }}
            >
              <Image
                className={` absolute bottom-0 left-0 right-0 top-0 z-20   transition-all ${
                  agent.some((a) => a.name === "DONALD_TRUMP")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-10 h-[60px] w-[60px] scale-[110%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/DONALD_TRUMP.png"}
                width={75}
                height={75}
                alt="trump"
              />
            </div>
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
                className={` absolute bottom-0 left-0 right-0 top-0 z-20   transition-all ${
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
                className="z-10 h-[60px] w-[60px] scale-[110%] xs:h-[75px] xs:w-[75px]"
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
                className="z-10 h-[60px] w-[60px] scale-[110%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/BEN_SHAPIRO.png"}
                width={75}
                height={75}
                alt="ben shapiro"
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
                className="z-10 h-[60px] w-[60px] scale-[125%] xs:h-[75px] xs:w-[75px]"
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
                className="z-0 h-[60px] w-[60px] scale-[120%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/BARACK_OBAMA.png"}
                width={75}
                height={75}
                alt="barack"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "JOE_BIDEN")
                    ? "border border-border"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "JOE_BIDEN")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isBarackObama = currentAgents.some(
                    (agent) => agent.name === "JOE_BIDEN",
                  );

                  if (isBarackObama) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "JOE_BIDEN",
                    );
                  } else {
                    return [...currentAgents, { name: "JOE_BIDEN", id: 5 }];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                  agent.some((a) => a.name === "JOE_BIDEN")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-0 h-[60px] w-[60px] scale-[120%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/JOE_BIDEN.png"}
                width={75}
                height={75}
                alt="barack"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "LIL_YACHTY")
                    ? "border border-border"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "LIL_YACHTY")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isBarackObama = currentAgents.some(
                    (agent) => agent.name === "LIL_YACHTY",
                  );

                  if (isBarackObama) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "LIL_YACHTY",
                    );
                  } else {
                    return [...currentAgents, { name: "LIL_YACHTY", id: 6 }];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                  agent.some((a) => a.name === "LIL_YACHTY")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-0 h-[60px] w-[60px] scale-[120%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/LIL_YACHTY.png"}
                width={75}
                height={75}
                alt="barack"
              />
            </div>
            <div
              className={cn(
                `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                `${
                  agent.some((a) => a.name === "MARK_ZUCKERBERG")
                    ? "border border-border"
                    : ""
                }`,
              )}
              onClick={() => {
                if (
                  agent.length === 2 &&
                  !agent.some((a) => a.name === "MARK_ZUCKERBERG")
                ) {
                  return;
                }
                setAgent((currentAgents) => {
                  const isBarackObama = currentAgents.some(
                    (agent) => agent.name === "MARK_ZUCKERBERG",
                  );

                  if (isBarackObama) {
                    return currentAgents.filter(
                      (agent) => agent.name !== "MARK_ZUCKERBERG",
                    );
                  } else {
                    return [
                      ...currentAgents,
                      { name: "MARK_ZUCKERBERG", id: 7 },
                    ];
                  }
                });
              }}
            >
              <Image
                className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                  agent.some((a) => a.name === "MARK_ZUCKERBERG")
                    ? "opacity-40"
                    : "opacity-0"
                }`}
                height={75}
                width={75}
                src={"https://images.smart.wtf/fireball.gif"}
                alt="fire"
              />
              <Image
                className="z-0 h-[60px] w-[60px] scale-[120%] xs:h-[75px] xs:w-[75px]"
                src={"https://images.smart.wtf/MARK_ZUCKERBERG.png"}
                width={75}
                height={75}
                alt="barack"
              />
            </div>
          </div>
        </div>
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"outline"}>Additional Options</Button>
            </DialogTrigger>
            <DialogContent>
              {/* <div className="absolute inset-0 z-40 flex h-full w-full items-center justify-center rounded-lg bg-primary/50">
                <p className="text-center text-4xl font-bold text-secondary">
                  COMING SOON
                </p>
              </div> */}
              <div className="relative flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <h6>Background video</h6>
                  <Film className="size-4 text-success" />
                </div>
                <DialogClose>
                  <XIcon className="absolute right-2 top-2 h-4 w-4 cursor-pointer transition-all hover:opacity-80" />
                </DialogClose>
                <div className="flex flex-wrap gap-2">
                  <div
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                    )}
                    onClick={() => {
                      if (background === "TRUCK") {
                        setBackground(null);
                      } else {
                        setBackground("TRUCK");
                      }
                    }}
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                        background === "TRUCK" ? "opacity-40" : "opacity-0"
                      }`}
                      height={90}
                      width={90}
                      src={"https://images.smart.wtf/fireball.gif"}
                      alt="fire"
                    />
                    <Image
                      className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                      src={"https://images.smart.wtf/TRUCK.png"}
                      width={90}
                      height={90}
                      alt="TRUCK"
                    />
                  </div>
                  <div
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                    )}
                    onClick={() => {
                      if (background === "MINECRAFT") {
                        setBackground(null);
                      } else {
                        setBackground("MINECRAFT");
                      }
                    }}
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                        background === "MINECRAFT" ? "opacity-40" : "opacity-0"
                      }`}
                      height={90}
                      width={90}
                      src={"https://images.smart.wtf/fireball.gif"}
                      alt="fire"
                    />
                    <Image
                      className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                      src={"https://images.smart.wtf/minecraft.webp"}
                      width={90}
                      height={90}
                      alt="minecraft"
                    />
                  </div>
                  <div
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                    )}
                    onClick={() => {
                      if (background === "GTA") {
                        setBackground(null);
                      } else {
                        setBackground("GTA");
                      }
                    }}
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                        background === "GTA" ? "opacity-40" : "opacity-0"
                      }`}
                      height={90}
                      width={90}
                      src={"https://images.smart.wtf/fireball.gif"}
                      alt="fire"
                    />
                    <Image
                      className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                      src={"https://images.smart.wtf/gta.png"}
                      width={90}
                      height={90}
                      alt="bender"
                    />
                  </div>
                </div>
                <div className="flex flex-row items-center gap-4 ">
                  <div className="flex items-center gap-1">
                    <h6>Background music</h6>
                    <Music className="size-4 text-english" />
                  </div>{" "}
                  |{" "}
                  <Button
                    onClick={() => setMusic("NONE")}
                    size={"sm"}
                    variant={music === "NONE" ? "default" : "outline"}
                  >
                    off
                  </Button>
                </div>

                <div
                  className={`flex flex-wrap gap-2 ${
                    music === "NONE" ? "opacity-50" : ""
                  }`}
                >
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className={cn(
                          `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                        )}
                        onClick={() => {
                          if (music === "WII_SHOP_CHANNEL_TRAP") {
                            setMusic(null);
                          } else {
                            setMusic("WII_SHOP_CHANNEL_TRAP");
                          }
                        }}
                      >
                        <Image
                          className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                            music === "WII_SHOP_CHANNEL_TRAP"
                              ? "opacity-40"
                              : "opacity-0"
                          }`}
                          height={90}
                          width={90}
                          src={"https://images.smart.wtf/fireball.gif"}
                          alt="fire"
                        />
                        <Image
                          className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                          src={"https://images.smart.wtf/wiisports.png"}
                          width={90}
                          height={90}
                          alt="wii sports"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      Wii Shop Channel Trap
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className={cn(
                          `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                        )}
                        onClick={() => {
                          if (music === "MONKEYS_SPINNING_MONKEYS") {
                            setMusic(null);
                          } else {
                            setMusic("MONKEYS_SPINNING_MONKEYS");
                          }
                        }}
                      >
                        <Image
                          className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                            music === "MONKEYS_SPINNING_MONKEYS"
                              ? "opacity-40"
                              : "opacity-0"
                          }`}
                          height={90}
                          width={90}
                          src={"https://images.smart.wtf/fireball.gif"}
                          alt="fire"
                        />
                        <Image
                          className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                          src={"https://images.smart.wtf/monkey.png"}
                          width={90}
                          height={90}
                          alt="minecraft"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      Monkeys Spinning Monkeys
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div
                        className={cn(
                          `relative cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary transition-all hover:scale-[102%] active:scale-[98%]`,
                        )}
                        onClick={() => {
                          if (music === "FLUFFING_A_DUCK") {
                            setMusic(null);
                          } else {
                            setMusic("FLUFFING_A_DUCK");
                          }
                        }}
                      >
                        <Image
                          className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                            music === "FLUFFING_A_DUCK"
                              ? "opacity-40"
                              : "opacity-0"
                          }`}
                          height={90}
                          width={90}
                          src={"https://images.smart.wtf/fireball.gif"}
                          alt="fire"
                        />
                        <Image
                          className="z-10 h-[60px] w-[60px] xs:h-[90px] xs:w-[90px]"
                          src={"https://images.smart.wtf/fluffing.png"}
                          width={90}
                          height={80}
                          alt="fluffing a duck"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      Fluffing a Duck
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  {!userDB?.subscribed ? (
                    <div className="absolute z-20 flex h-full w-full items-center justify-center rounded-lg border border-border bg-black/40 text-xl font-bold text-secondary dark:text-primary">
                      <ProButton>
                        <Button
                          className="flex flex-row items-center gap-2 "
                          variant="brain"
                          size="sm"
                        >
                          GO PRO <Crown className="size-4" />
                        </Button>
                      </ProButton>
                    </div>
                  ) : null}
                  <div className=" flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h6>FPS: </h6>
                      <div className="flex flex-wrap items-center gap-1 xs:gap-2">
                        <Button
                          variant={fps === 20 ? "default" : "outline"}
                          onClick={() => setFps(20)}
                          size={"sm"}
                        >
                          20
                        </Button>{" "}
                        |
                        <Button
                          onClick={() => setFps(30)}
                          size={"sm"}
                          variant={fps === 30 ? "default" : "outline"}
                        >
                          30
                        </Button>{" "}
                        |
                        <Button
                          onClick={() => setFps(50)}
                          size={"sm"}
                          variant={fps === 50 ? "default" : "outline"}
                        >
                          50
                        </Button>{" "}
                        |
                        <Button
                          onClick={() => setFps(60)}
                          size={"sm"}
                          variant={fps === 60 ? "default" : "outline"}
                        >
                          60
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h6>Duration: </h6>
                      <div className="flex flex-row items-center gap-1 xs:gap-2">
                        <Button
                          variant={duration === 1 ? "default" : "outline"}
                          onClick={() => setDuration(1)}
                          size={"sm"}
                        >
                          1 min
                        </Button>{" "}
                        |
                        <Button
                          disabled
                          onClick={() => {
                            if (assetType === "AI") {
                              setAssetType("GOOGLE");
                            }
                            setDuration(2);
                          }}
                          size={"sm"}
                          variant={duration === 2 ? "default" : "outline"}
                        >
                          2 min
                        </Button>{" "}
                        |
                        <Button
                          disabled
                          onClick={() => {
                            if (assetType === "AI") {
                              setAssetType("GOOGLE");
                            }
                            setDuration(3);
                          }}
                          size={"sm"}
                          variant={duration === 3 ? "default" : "outline"}
                        >
                          3 min
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h6>Assets: </h6>
                      <div className="flex flex-row items-center gap-1 xs:gap-2">
                        <Button
                          variant={assetType === "AI" ? "default" : "outline"}
                          onClick={() => setAssetType("AI")}
                          size={"sm"}
                          disabled={(duration ?? 0) > 1}
                        >
                          AI Generated
                        </Button>
                        |
                        <Button
                          onClick={() => setAssetType("GOOGLE")}
                          size={"sm"}
                          variant={
                            assetType === "GOOGLE" ? "default" : "outline"
                          }
                        >
                          Google Search
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {userDB?.subscribed ? (
                <p className="flex flex-row items-center gap-1 text-sm text-blue">
                  <Info className="size-3 text-blue" />
                  We only support 1 min videos rn
                </p>
              ) : null}

              <div className="flex flex-row items-center justify-between">
                <DialogClose
                  disabled={
                    !background && !music && !fps && !duration && !assetType
                  }
                >
                  <Button
                    disabled={
                      !background && !music && !fps && !duration && !assetType
                    }
                    className="flex items-center gap-2"
                    onClick={() => toast.info("saved options!", { icon: "💾" })}
                  >
                    Save <Save className="size-4" />
                  </Button>
                </DialogClose>
                <div className=" flex flex-col gap-1 rounded-lg border-[2px] border-dashed bg-secondary p-2 ">
                  <p className="text-xs font-bold">
                    Cost in Credits:{" "}
                    <span className="text-blue">{credits}</span>/
                    <span className="text-red-500">{userDB?.credits ?? 0}</span>
                  </p>
                  <Progress value={credits / 0.6} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {user.userId ? (
          <>
            {(userDB?.credits ?? 0) < credits && (
              <p className="flex flex-row items-center gap-1 text-sm text-red-500/80">
                <AlertTriangle className="size-3" />
                You have insufficient credits for this generation
              </p>
            )}
            {videoStatus.data?.videos !== null && (
              <p className="text-sm text-destructive/60">
                Error. Please refresh the page.
              </p>
            )}
          </>
        ) : null}

        <DialogFooter className="flex flex-row items-center justify-between">
          <Button
            disabled={
              agent.length !== 2 ||
              (videoInput === "" && recommendedSelect === -1) ||
              generating ||
              videoStatus.data?.videos !== null ||
              (userDB?.credits ?? 0) < credits
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
                cost: credits,
                remainingCredits: userDB?.credits ?? 0,
              });
            }}
          >
            {generating ? "Generating..." : "Generate"}
            <Wand className="h-4 w-4" />
          </Button>
          <div className=" flex flex-col gap-1 rounded-lg border-[2px] border-dashed bg-secondary p-2 ">
            <p className="text-xs font-bold">
              Cost in Credits: <span className="text-blue">{credits}</span>/
              <span className="text-red-500">{userDB?.credits ?? 0}</span>
            </p>
            <Progress value={credits / 0.6} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
