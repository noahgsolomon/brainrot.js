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
  Search,
  Loader2,
  Download,
  FileText,
  Check,
  Play,
  Pause,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCreateVideo } from "./usecreatevideo";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/trpc/client";

import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import ProButton from "./ProButton";
import { useGenerationType } from "./usegenerationtype";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import BuyCreditsDialog from "./buy-credits-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAudioStore } from "@/store/audioStore";

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
      stiffness: 260,
      damping: 20,
    },
  },
};

// Animation variants for song cards
const songCardAnimation = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

// Staggered container for song cards
const songListAnimation = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Animation for selected track
const selectedTrackAnimation = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
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
        | "SPONGEBOB"
        | PodcastHost
        | PodcastGuest;
      id: number;
    }[]
  >([]);
  const [recommendedSelect, setRecommendedSelect] = useState(-1);
  const credits = 10;

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
        console.log(data);
        if (data.mode === "rap" && !data.downloadUrl) {
          toast.error("No download URL found. Please try a different song.");
          return;
        }
        const uuidVal = uuidv4();
        await fetch("/api/create", {
          method: "POST",
          body: JSON.stringify({
            topic: videoDetails.title,
            agent1: videoDetails.agents[0]?.name ?? "JORDAN_PETERSON",
            agent2: videoDetails.agents[1]?.name ?? "BEN_SHAPIRO",
            videoId: uuidVal,
            music: videoDetails.music,
            credits: videoDetails.cost,
            apiKey: data.apiKey,
            mode: videoDetails.mode,
            videoMode: videoDetails.mode,
            outputType: videoDetails.outputType,
            lyrics: videoDetails.mode === "rap" ? data.lyrics : undefined,
            audioUrl:
              videoDetails.mode === "rap" ? data.downloadUrl : undefined,
            songName:
              videoDetails.mode === "rap" ? selectedTrack?.name : undefined,
            artistName:
              videoDetails.mode === "rap"
                ? selectedTrack?.artists[0]?.name
                : undefined,
            rapper:
              data.mode === "rap" ? videoDetails.agents[0]?.name : undefined,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.apiKey}`,
          },
        });

        setGenerating(false);
        setIsInQueue(true);
        setIsOpen(false);
      } else {
        setGenerating(false);
        setInvalidTopic(true);
        setVideoInput("");
        toast.error("Invalid topic. Please try again.");
      }

      // Show comment toast regardless of valid/invalid topic
      if (data?.comment) {
        data.comment = data.comment
          .replace(/[\u2018\u2019\u201B\u2032\u2035\u275B\u275C']/g, "'")
          .replace(/[\u201C\u201D\u201F\u275D\u275E"]/g, '"');

        const selectedAgent =
          Math.random() < 0.5
            ? videoDetails.agents[0]?.name
            : videoDetails.agents[1]?.name;

        setTimeout(() => {
          toast(
            <div className="relative flex w-full items-center">
              <div className="absolute left-0">
                <Image
                  src={`/img/${selectedAgent}.png`}
                  width={48}
                  height={48}
                  alt="agent"
                  className="rounded-full"
                />
              </div>
              <div className="w-full pl-16">{data.comment}</div>
            </div>,
            {
              className: "text-lg font-bold",
            },
          );
        }, 3000);
      }
    },
    onError: (e) => {
      console.log(e);
      setGenerating(false);
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchQueryString, setSearchQueryString] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [tracks, setTracks] = useState<
    {
      id: string;
      name: string;
      artists: { name: string }[];
      album: {
        images: { url: string; height: number; width: number }[];
      };
      external_urls: { spotify: string };
      preview_url: string | null;
    }[]
  >([]);
  const [selectedTrack, setSelectedTrack] = useState<(typeof tracks)[0] | null>(
    null,
  );
  const [searchError, setSearchError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioStore = useAudioStore();

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSongSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);

  // Add back the searchQueryString effect
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
    } else if (videoDetails.mode === "rap") {
      setAgent([newAgent]);
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

  const handleSongSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      setSearchError("");
      setTracks([]);

      console.log("Searching for:", query);

      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Search response:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.tracks || !Array.isArray(data.tracks.items)) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format from Spotify API");
      }

      setTracks(data.tracks.items || []);
    } catch (err) {
      console.error("Search error:", err);
      setSearchError(
        err instanceof Error ? err.message : "Failed to search for tracks",
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectTrack = (track: (typeof tracks)[0]) => {
    if (selectedTrack?.id === track.id) {
      setSelectedTrack(null);
      setVideoInput("");
    } else {
      // Select new track
      setSelectedTrack(track);
      setVideoInput(
        `${track.name} by ${track.artists.map((a) => a.name).join(", ")}`,
      );
      setSearchQuery("");
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

          {videoDetails.mode !== "rap" && (
            <>
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
                <div className="flex flex-col justify-center gap-1 pb-4">
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
            </>
          )}

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
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                    src={"/img/JORDAN_PETERSON.png"}
                    width={75}
                    height={75}
                    alt="jordan"
                  />
                </motion.div>
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                    src={"/img/BEN_SHAPIRO.png"}
                    width={75}
                    height={75}
                    alt="ben shapiro"
                  />
                </motion.div>
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                    src={"/img/JOE_ROGAN.png"}
                    width={75}
                    height={75}
                    alt="bender"
                  />
                </motion.div>

                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
                  onClick={() =>
                    handleAgentSelection({ name: "BARACK_OBAMA", id: 4 })
                  }
                >
                  <Image
                    className={`absolute bottom-0 left-0 right-0 top-0  transition-all ${
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
                    src={"/img/BARACK_OBAMA.png"}
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
                      className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                        src={"/img/DONALD_TRUMP.png"}
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
                    className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                      src={"/img/DONALD_TRUMP.png"}
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
                      className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                        src={"/img/JOE_BIDEN.png"}
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
                    className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                      src={"/img/JOE_BIDEN.png"}
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
                      className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                        src={"/img/ANDREW_TATE.png"}
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
                    className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                      src={"/img/ANDREW_TATE.png"}
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
                      className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                        src={"/img/KAMALA_HARRIS.png"}
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
                    className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                      src={"/img/KAMALA_HARRIS.png"}
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
                      className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                        src={`/img/${hostName}.png`}
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
                            className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
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
                              src={`/img/${guestName}.png`}
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
          ) : videoDetails.mode === "rap" ? (
            <motion.div
              className="flex flex-col gap-8"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="flex flex-col gap-4"
              >
                <motion.div className="flex items-center gap-2">
                  <h4>1.{")"} Choose a song to rap over</h4>
                  <Music className="h-4 w-4" />
                </motion.div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Input
                        placeholder="Search for a song..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSearchError("");
                        }}
                        className="pr-10"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                    <AnimatePresence>
                      {searchError && (
                        <motion.p
                          className="text-sm text-destructive"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {searchError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence mode="wait">
                      {selectedTrack ? (
                        <motion.div
                          key="selected-track"
                          variants={selectedTrackAnimation}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex cursor-pointer items-center justify-between rounded-lg border border-blue bg-blue/20 p-[1.125rem] transition-colors duration-200"
                          onClick={() => handleSelectTrack(selectedTrack)}
                        >
                          <div className="flex items-center gap-4">
                            {selectedTrack.album.images[0] && (
                              <div className="relative h-12 w-12">
                                <img
                                  src={selectedTrack.album.images[0].url}
                                  alt={`${selectedTrack.name} album artwork`}
                                  className="h-12 w-12 rounded-md object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {selectedTrack.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {selectedTrack.artists
                                  .map((a) => a.name)
                                  .join(", ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center text-blue">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        </motion.div>
                      ) : tracks.length > 0 ? (
                        <motion.div
                          key="track-list"
                          variants={songListAnimation}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          {tracks.map((track) => (
                            <motion.div
                              key={track.id}
                              variants={songCardAnimation}
                              className="flex cursor-pointer items-center justify-between rounded-lg border p-[1.125rem] transition-colors duration-200 hover:border-blue hover:bg-blue/20"
                              onClick={() => handleSelectTrack(track)}
                            >
                              <div className="flex items-center gap-4">
                                {track.album.images[0] && (
                                  <div className="relative h-12 w-12">
                                    <img
                                      src={track.album.images[0].url}
                                      alt={`${track.name} album artwork`}
                                      className="h-12 w-12 rounded-md object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{track.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {track.artists
                                      .map((a) => a.name)
                                      .join(", ")}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      ) : isSearching && searchQuery.length > 0 ? (
                        <motion.div
                          key="searching"
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="rounded-md border border-dashed p-8 text-center"
                        >
                          <p className="text-sm text-muted-foreground">
                            Searching...
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty-state"
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="rounded-md border border-dashed p-8 text-center"
                        >
                          <p className="text-sm text-muted-foreground">
                            {searchQuery.length > 0
                              ? "No tracks found. Try a different search."
                              : "Search for a song to get started."}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              <motion.div className="flex items-center gap-2">
                <h4>2.{")"} Choose your rapper</h4>
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
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
                  onClick={() =>
                    handleAgentSelection({ name: "SPONGEBOB", id: 1 })
                  }
                >
                  <Image
                    className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
                      agent.some((a) => a.name === "SPONGEBOB")
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
                    src={"/img/SPONGEBOB.png"}
                    width={75}
                    height={75}
                    alt="spongebob"
                  />
                </motion.div>
                <motion.div
                  variants={agentAnimation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative cursor-pointer overflow-hidden rounded-full border border-border bg-secondary"
                  onClick={() =>
                    handleAgentSelection({ name: "BARACK_OBAMA", id: 2 })
                  }
                >
                  <Image
                    className={`absolute bottom-0 left-0 right-0 top-0 z-20 transition-all ${
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
                    className="z-10 h-[60px] w-[60px] scale-[110%] xs:h-[75px] xs:w-[75px]"
                    src={"/img/BARACK_OBAMA.png"}
                    width={75}
                    height={75}
                    alt="barack obama"
                  />
                </motion.div>
              </motion.div>

              {/* <motion.div className="flex flex-col gap-2">
                <h4>3.{")"} Choose your output type</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOutputTypeSelection("video")}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-1 transition-all duration-200 ${
                      videoDetails.outputType === "video"
                        ? "border-blue bg-blue/20"
                        : "hover:border-blue hover:bg-blue/20"
                    } hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    Video
                    {videoDetails.outputType === "video" && (
                      <Check className="h-4 w-4 text-blue" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOutputTypeSelection("audio")}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-1 transition-all duration-200 ${
                      videoDetails.outputType === "audio"
                        ? "border-blue bg-blue/20"
                        : "hover:border-blue hover:bg-blue/20"
                    } hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    Audio Only
                    {videoDetails.outputType === "audio" && (
                      <Check className="h-4 w-4 text-blue" />
                    )}
                  </button>
                </div>
              </motion.div> */}
            </motion.div>
          ) : null}
          {user.userId ? (
            <>
              {videoStatus.data?.videos !== null && (
                <p className="text-sm text-destructive/60">
                  Error. Please refresh the page.
                </p>
              )}
            </>
          ) : null}

          {videoDetails.mode === "rap" && (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="mb-4 mt-4"
            >
              <div className="flex flex-col gap-2 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Listen to this example to get an idea of what will be
                  generated in rap mode:
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (audioStore.currentTrack?.id === "example-rap") {
                        audioStore.toggle();
                      } else {
                        const exampleTrack = {
                          id: "example-rap",
                          title: "Family Matters",
                          subtitle: "Spongebob - Example rap output",
                          src: "/audios/fam.mp3",
                        };
                        audioStore.play(exampleTrack);
                      }
                    }}
                    className="flex items-center justify-center rounded-full bg-blue/20 p-2 transition-all hover:scale-[1.05] hover:bg-blue/30 active:scale-[0.95]"
                  >
                    {audioStore.currentTrack?.id === "example-rap" &&
                    audioStore.isPlaying ? (
                      <Pause className="h-5 w-5 text-blue" />
                    ) : (
                      <Play className="h-5 w-5 text-blue" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="font-medium">Family Matters</span>
                    <span className="text-xs text-muted-foreground">
                      Spongebob - Example rap output
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="mt-4"
          >
            <DialogFooter className="flex flex-row items-center justify-between">
              <Button
                disabled={
                  (videoDetails.mode !== "monologue" &&
                    videoDetails.mode !== "rap" &&
                    agent.length !== 2) ||
                  (videoDetails.mode === "monologue" && agent.length !== 1) ||
                  (videoDetails.mode === "rap" && agent.length !== 1) ||
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
                    assetType: "AI",
                    background: "MINECRAFT",
                    music: "WII_SHOP_CHANNEL_TRAP",
                    duration: 1,
                    fps: 60,
                    outputType: videoDetails.outputType,
                  });
                  setGenerating(true);
                  createVideoMutation.mutate({
                    title: videoInput,
                    agent1: agent[0]?.id ?? 0,
                    agent2: agent[1]?.id ?? 1,
                    cost: credits,
                    remainingCredits: userDB?.credits ?? 0,
                    outputType: videoDetails.outputType,
                    mode: videoDetails.mode,
                    trackId:
                      videoDetails.mode === "rap"
                        ? selectedTrack?.id
                        : undefined,
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
