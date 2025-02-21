"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertTriangle,
  BookMarked,
  Coins,
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

import { toast } from "sonner";
import { DialogClose, DialogTrigger } from "@radix-ui/react-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import ProButton from "./ProButton";
import { useGenerationType } from "./usegenerationtype";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import BuyCreditsDialog from "./buy-credits-dialog";

export type PodcastHost = "JOE_ROGAN" | "JORDAN_PETERSON" | "LEX_FRIDMAN";
export type PodcastGuest =
  | "DONALD_TRUMP"
  | "JORDAN_PETERSON"
  | "LEX_FRIDMAN"
  | "ELON_MUSK"
  | "JOE_ROGAN"
  | "MARC_ANDREESSEN";

const PODCAST_GUEST_OPTIONS: Record<PodcastHost, PodcastGuest[]> = {
  JOE_ROGAN: ["DONALD_TRUMP", "JORDAN_PETERSON", "LEX_FRIDMAN", "ELON_MUSK"],
  JORDAN_PETERSON: ["JOE_ROGAN", "MARC_ANDREESSEN"],
  LEX_FRIDMAN: ["JOE_ROGAN", "JORDAN_PETERSON", "ELON_MUSK"],
};

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const agentAnimation = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

export default function CreateVideo({
  visible = false,
}: {
  visible?: boolean;
}) {
  const user = useAuth();

  const userDB = trpc.user.user.useQuery().data?.user;

  const videoStatus = trpc.user.videoStatus.useQuery();

  const {
    isOpen,
    setIsOpen,
    invalidTopic,
    setInvalidTopic,
    setVideoInput,
    videoInput,
    setIsInQueue,
  } = useCreateVideo();
  const {
    setIsOpen: setIsGenerationTypeOpen,
    setVideoDetails,
    videoDetails,
  } = useGenerationType();

  const [agent, setAgent] = useState<
    {
      name:
        | "JORDAN_PETERSON"
        | "JOE_ROGAN"
        | "BARACK_OBAMA"
        | "DONALD_TRUMP"
        | "BEN_SHAPIRO"
        | "ANDREW_TATE"
        | "KAMALA_HARRIS"
        | "JOE_BIDEN"
        | PodcastHost
        | PodcastGuest;
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
  const [assetType, setAssetType] = useState<"AI" | "GOOGLE" | null>("AI");
  const [credits, setCredits] = useState(10);

  const [generating, setGenerating] = useState(false);
  const [recommendedTopics] = useState<string[]>([
    "Covariance Matrix",
    "Alien Invasion",
    "Fall of Roman Empire",
  ]);
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] =
    useState(false);

  const createVideoMutation = trpc.user.createVideo.useMutation({
    onSuccess: async (data) => {
      if (data?.valid) {
        const uuidVal = uuidv4();
        await fetch("/api/create", {
          method: "POST",
          body: JSON.stringify({
            topic: videoDetails.title,
            agent1: videoDetails.agents[0]?.name ?? "JORDAN_PETERSON",
            agent2: videoDetails.agents[1]?.name ?? "BEN_SHAPIRO",
            videoId: uuidVal,
            duration: 1,
            music: videoDetails.music,
            background: videoDetails.background,
            fps: videoDetails.fps,
            aiGeneratedImages: videoDetails.assetType === "AI" ? true : false,
            cleanSrt: true,
            credits: videoDetails.cost,
            apiKey: data.apiKey,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.apiKey}`,
          },
        });

        setGenerating(false);
        setIsInQueue(true);
        setIsOpen(false);
        toast.success("Video is in queue!");
      } else {
        setGenerating(false);
        setInvalidTopic(true);
        setVideoInput("");
        toast.error("Invalid topic. Please try again.");
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

  useEffect(() => {
    let value = 10;
    if (assetType === "AI") {
      value += 0;
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

  const [isPurchaseCreditsOpen, setIsPurchaseCreditsOpen] = useState(false);

  const handleAgentSelection = (newAgent: (typeof agent)[0]) => {
    if (videoDetails.mode === "monologue") {
      setAgent([newAgent]);
    } else if (videoDetails.mode === "podcast") {
      if (newAgent.id === 1) {
        setAgent([newAgent]);
      } else {
        const host = agent.find((a) => a.id === 1);
        if (host) {
          const existingGuest = agent.find((a) => a.id === 2);
          if (existingGuest?.name === newAgent.name) {
            setAgent([host]);
          } else {
            setAgent([host, newAgent]);
          }
        }
      }
    } else {
      setAgent((currentAgents) => {
        const isAgentPresent = currentAgents.some(
          (agent) => agent.name === newAgent.name,
        );

        if (isAgentPresent) {
          return currentAgents.filter((agent) => agent.name !== newAgent.name);
        } else if (currentAgents.length < 2) {
          return [...currentAgents, newAgent];
        }
        return currentAgents;
      });
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setAgent([]);
          }
        }}
      >
        <DialogContent className=" max-h-[75%] max-w-[90%] rounded-lg xs:max-w-[425px]">
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <DialogHeader>
              <DialogTitle className="relative">
                <h3>Configure your {videoDetails.mode} video</h3>
              </DialogTitle>
              <DialogDescription>Choose your settings</DialogDescription>
            </DialogHeader>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex items-center gap-2 pb-2"
          >
            <h4>1.{")"} Choose a topic.</h4>
            <Image
              height={30}
              width={30}
              src={"https://images.smart.wtf/book.gif"}
              alt="book"
            />
          </motion.div>

          <div>
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
                } text-base font-bold text-destructive`}
              >
                Not a valid topic
              </p>
            </div>
          </div>

          {videoDetails.mode === "monologue" ||
          videoDetails.mode === "brainrot" ? (
            <motion.div
              className="flex flex-col gap-2"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="flex items-center gap-2">
                <h4>
                  2.{")"} Choose your{" "}
                  {videoDetails.mode === "monologue" ? "speaker" : "fighters"}!
                </h4>
                <Image
                  height={20}
                  width={20}
                  src={"https://images.smart.wtf/fireball.gif"}
                  alt="fire"
                />
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-2"
                variants={staggerContainer}
              >
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                    `${
                      agent.some((a) => a.name === "JORDAN_PETERSON")
                        ? "border border-blue"
                        : ""
                    }`,
                  )}
                  onClick={() =>
                    handleAgentSelection({ name: "JORDAN_PETERSON", id: 1 })
                  }
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
                    className="z-10 h-[60px] w-[60px] scale-[110%] xs:h-[75px] xs:w-[75px]"
                    src={"https://images.smart.wtf/JORDAN_PETERSON.png"}
                    width={75}
                    height={75}
                    alt="jordan"
                  />
                </motion.div>
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                    `${
                      agent.some((a) => a.name === "BEN_SHAPIRO")
                        ? "border border-mrburns"
                        : ""
                    }`,
                  )}
                  onClick={() =>
                    handleAgentSelection({ name: "BEN_SHAPIRO", id: 2 })
                  }
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
                </motion.div>
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                    `${
                      agent.some((a) => a.name === "JOE_ROGAN")
                        ? "border border-bender"
                        : ""
                    }`,
                  )}
                  onClick={() =>
                    handleAgentSelection({ name: "JOE_ROGAN", id: 3 })
                  }
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
                </motion.div>

                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                    `${
                      agent.some((a) => a.name === "BARACK_OBAMA")
                        ? "border border-patrick"
                        : ""
                    }`,
                  )}
                  onClick={() =>
                    handleAgentSelection({ name: "BARACK_OBAMA", id: 4 })
                  }
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
                </motion.div>
                {!userDB?.subscribed ? (
                  <ProButton>
                    <motion.div
                      variants={agentAnimation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                        `${
                          agent.some((a) => a.name === "DONALD_TRUMP")
                            ? "border border-red-500"
                            : ""
                        }`,
                      )}
                    >
                      <div className="absolute z-30 flex h-full w-full items-center justify-center rounded-full bg-black/40">
                        <Crown className="size-4 text-secondary dark:text-primary" />
                      </div>
                      <Image
                        className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
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
                    </motion.div>
                  </ProButton>
                ) : (
                  <motion.div
                    variants={agentAnimation}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                      `${
                        agent.some((a) => a.name === "DONALD_TRUMP")
                          ? "border border-red-500"
                          : ""
                      }`,
                    )}
                    onClick={() =>
                      handleAgentSelection({ name: "DONALD_TRUMP", id: 1 })
                    }
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
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
                  </motion.div>
                )}
                {!userDB?.subscribed ? (
                  <ProButton>
                    <motion.div
                      variants={agentAnimation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                        `${
                          agent.some((a) => a.name === "JOE_BIDEN")
                            ? "border border-border"
                            : ""
                        }`,
                      )}
                    >
                      <div className="absolute z-30 flex h-full w-full items-center justify-center rounded-full bg-black/40">
                        <Crown className="size-4 text-secondary dark:text-primary" />
                      </div>
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
                        alt="biden"
                      />
                    </motion.div>
                  </ProButton>
                ) : (
                  <motion.div
                    variants={agentAnimation}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                      `${
                        agent.some((a) => a.name === "JOE_BIDEN")
                          ? "border border-border"
                          : ""
                      }`,
                    )}
                    onClick={() =>
                      handleAgentSelection({ name: "JOE_BIDEN", id: 5 })
                    }
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
                      alt="biden"
                    />
                  </motion.div>
                )}
                {!userDB?.subscribed ? (
                  <ProButton>
                    <motion.div
                      variants={agentAnimation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                        `${
                          agent.some((a) => a.name === "ANDREW_TATE")
                            ? "border border-patrick"
                            : ""
                        }`,
                      )}
                    >
                      <div className="absolute z-30 flex h-full w-full items-center justify-center rounded-full bg-black/40">
                        <Crown className="size-4 text-secondary dark:text-primary" />
                      </div>
                      <Image
                        className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                          agent.some((a) => a.name === "ANDREW_TATE")
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
                        src={"https://images.smart.wtf/ANDREW_TATE.png"}
                        width={75}
                        height={75}
                        alt="andrewtate"
                      />
                    </motion.div>
                  </ProButton>
                ) : (
                  <motion.div
                    variants={agentAnimation}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                      `${
                        agent.some((a) => a.name === "ANDREW_TATE")
                          ? "border border-patrick"
                          : ""
                      }`,
                    )}
                    onClick={() =>
                      handleAgentSelection({ name: "ANDREW_TATE", id: 7 })
                    }
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                        agent.some((a) => a.name === "ANDREW_TATE")
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
                      src={"https://images.smart.wtf/ANDREW_TATE.png"}
                      width={75}
                      height={75}
                      alt="andrewtate"
                    />
                  </motion.div>
                )}
                {!userDB?.subscribed ? (
                  <ProButton>
                    <motion.div
                      variants={agentAnimation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                        `${
                          agent.some((a) => a.name === "KAMALA_HARRIS")
                            ? "border border-patrick"
                            : ""
                        }`,
                      )}
                    >
                      <div className="absolute z-30 flex h-full w-full items-center justify-center rounded-full bg-black/40">
                        <Crown className="size-4 text-secondary dark:text-primary" />
                      </div>
                      <Image
                        className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                          agent.some((a) => a.name === "KAMALA_HARRIS")
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
                        src={"https://images.smart.wtf/KAMALA_HARRIS.png"}
                        width={75}
                        height={75}
                        alt="kamala"
                      />
                    </motion.div>
                  </ProButton>
                ) : (
                  <motion.div
                    variants={agentAnimation}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                      `${
                        agent.some((a) => a.name === "KAMALA_HARRIS")
                          ? "border border-patrick"
                          : ""
                      }`,
                    )}
                    onClick={() =>
                      handleAgentSelection({ name: "KAMALA_HARRIS", id: 6 })
                    }
                  >
                    <Image
                      className={`absolute bottom-0 left-0 right-0 top-0 z-20  transition-all ${
                        agent.some((a) => a.name === "KAMALA_HARRIS")
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
                      src={"https://images.smart.wtf/KAMALA_HARRIS.png"}
                      width={75}
                      height={75}
                      alt="kamala"
                    />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ) : videoDetails.mode === "podcast" ? (
            <motion.div
              className="flex flex-col gap-8"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="flex items-center gap-2">
                <h4>2.{")"} Choose your host</h4>
              </motion.div>

              <motion.div
                className="flex flex-wrap gap-2"
                variants={staggerContainer}
              >
                {["JOE_ROGAN", "JORDAN_PETERSON", "LEX_FRIDMAN"].map(
                  (hostName) => (
                    <motion.div
                      key={hostName}
                      variants={agentAnimation}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                        `${
                          agent[0]?.name === hostName
                            ? "border border-blue"
                            : ""
                        }`,
                      )}
                      onClick={() =>
                        handleAgentSelection({
                          name: hostName as PodcastHost,
                          id: 1,
                        })
                      }
                    >
                      <Image
                        className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                          agent[0]?.name === hostName
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
                        src={`https://images.smart.wtf/${hostName}.png`}
                        width={75}
                        height={75}
                        alt={hostName.toLowerCase()}
                      />
                    </motion.div>
                  ),
                )}
              </motion.div>

              <AnimatePresence>
                {agent[0]?.name && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={fadeIn}
                  >
                    <motion.div className="flex items-center gap-2">
                      <h4>3.{")"} Choose your guest</h4>
                    </motion.div>

                    <motion.div
                      className="flex flex-wrap gap-2"
                      variants={staggerContainer}
                    >
                      {PODCAST_GUEST_OPTIONS[agent[0].name as PodcastHost].map(
                        (guestName) => (
                          <motion.div
                            key={guestName}
                            variants={agentAnimation}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              `relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary`,
                              `${
                                agent[1]?.name === guestName
                                  ? "border border-blue"
                                  : ""
                              }`,
                            )}
                            onClick={() =>
                              handleAgentSelection({
                                name: guestName as PodcastGuest,
                                id: 2,
                              })
                            }
                          >
                            <Image
                              className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                                agent[1]?.name === guestName
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
                              src={`https://images.smart.wtf/${guestName}.png`}
                              width={75}
                              height={75}
                              alt={guestName.toLowerCase()}
                            />
                          </motion.div>
                        ),
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
          {videoDetails.mode === "brainrot" && (
            <div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant={"outline"}>Additional Options</Button>
                </DialogTrigger>
                <DialogContent>
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
                            background === "MINECRAFT"
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
                              data-action="subscribe"
                              className="flex flex-row items-center gap-2 "
                              variant="pink"
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
                              variant={
                                assetType === "AI" ? "default" : "outline"
                              }
                              onClick={() => setAssetType("AI")}
                              size={"sm"}
                              disabled={(duration ?? 0) > 1}
                            >
                              AI Generated
                            </Button>
                            |
                            <Button
                              disabled
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
                          !background &&
                          !music &&
                          !fps &&
                          !duration &&
                          !assetType
                        }
                        className="flex items-center gap-2"
                        onClick={() =>
                          toast.info("saved options!", { icon: "💾" })
                        }
                      >
                        Save <Save className="size-4" />
                      </Button>
                    </DialogClose>
                    <div className=" flex flex-col gap-1 rounded-lg border-[2px] border-dashed bg-secondary p-2 ">
                      <p className="text-xs font-bold">
                        Cost in Credits:{" "}
                        <span className="text-blue">{credits}</span>/
                        <span className="text-red-500">
                          {userDB?.credits ?? 0}
                        </span>
                      </p>
                      <Progress value={credits / 0.6} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {user.userId ? (
            <>
              {videoStatus.data?.videos !== null && (
                <p className="text-sm text-destructive/60">
                  Error. Please refresh the page.
                </p>
              )}
            </>
          ) : null}

          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="mt-4"
          >
            <DialogFooter className="flex flex-row items-center justify-between">
              <Button
                disabled={
                  (videoDetails.mode !== "monologue" && agent.length !== 2) ||
                  (videoDetails.mode === "monologue" && agent.length !== 1) ||
                  (videoInput === "" && recommendedSelect === -1) ||
                  generating ||
                  (!!user.userId && videoStatus.data?.videos !== null)
                }
                className="flex items-center gap-2"
                onClick={() => {
                  if ((userDB?.credits ?? 0) < credits) {
                    setIsInsufficientCreditsOpen(true);
                    return;
                  }
                  setVideoDetails({
                    mode: videoDetails.mode,
                    title:
                      (videoInput === ""
                        ? recommendedTopics[recommendedSelect]
                        : videoInput) ?? "the future of the world",
                    agents: agent,
                    cost: credits,
                    remainingCredits: userDB?.credits ?? 0,
                    duration: duration ?? 1,
                    fps: fps ?? 30,
                    background: background ?? null,
                    music: music ?? null,
                    assetType: assetType ?? null,
                  });
                  setGenerating(true);
                  createVideoMutation.mutate({
                    title: videoInput,
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
          </motion.div>
        </DialogContent>
        <Dialog
          open={isInsufficientCreditsOpen}
          onOpenChange={setIsInsufficientCreditsOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insufficient Credits</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <p className="text-center text-base text-muted-foreground">
                You need {credits} credits to generate this video. Choose an
                option below to continue:
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {!userDB?.subscribed && (
                  <div className="flex flex-col justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold">Go Pro</h3>
                      <p className="text-base text-muted-foreground">
                        Generate unlimited videos with all premium features
                      </p>
                    </div>
                    <ProButton searchQueryString={searchQueryString}>
                      <Button
                        data-action="subscribe"
                        className="w-full gap-2 text-secondary dark:text-primary"
                        variant="pink"
                      >
                        GO PRO <Crown className="size-4" />
                      </Button>
                    </ProButton>
                  </div>
                )}

                <div className="flex flex-col justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Buy Credits</h3>
                    <p className="text-base text-muted-foreground">
                      Purchase credits for individual videos
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="mt-2 flex w-full flex-row items-center justify-center gap-2"
                    variant="outline"
                    onClick={() => {
                      setIsPurchaseCreditsOpen(true);
                      setIsInsufficientCreditsOpen(false);
                    }}
                  >
                    Buy <Coins className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Dialog>

      <BuyCreditsDialog
        searchQueryString={searchQueryString}
        outerTrigger
        open={isPurchaseCreditsOpen}
        setOpen={setIsPurchaseCreditsOpen}
      />
    </>
  );
}
