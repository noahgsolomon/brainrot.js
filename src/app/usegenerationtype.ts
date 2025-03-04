import { create } from "zustand";
import { PodcastGuest } from "./createvideo";
import { PodcastHost } from "./createvideo";

interface useGenerationTypeProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  videoDetails: {
    mode: "brainrot" | "podcast" | "monologue" | "rap";
    title: string;
    agents: {
      name:
        | "JORDAN_PETERSON"
        | "BEN_SHAPIRO"
        | "JOE_ROGAN"
        | "BARACK_OBAMA"
        | "DONALD_TRUMP"
        | "JOE_BIDEN"
        | "ANDREW_TATE"
        | "KAMALA_HARRIS"
        | "SPONGEBOB"
        | PodcastHost
        | PodcastGuest;
      id: number;
    }[];
    cost: number;
    remainingCredits: number;
    duration: number;
    fps: number;
    background: string | null;
    music: string | null;
    assetType: string | null;
    outputType?: "video" | "audio";
  };
  setVideoDetails: (videoDetails: {
    mode: "brainrot" | "podcast" | "monologue" | "rap";
    title: string;
    agents: {
      name:
        | "JORDAN_PETERSON"
        | "BEN_SHAPIRO"
        | "JOE_ROGAN"
        | "BARACK_OBAMA"
        | "DONALD_TRUMP"
        | "JOE_BIDEN"
        | "ANDREW_TATE"
        | "KAMALA_HARRIS"
        | "SPONGEBOB"
        | PodcastHost
        | PodcastGuest;
      id: number;
    }[];
    cost: number;
    remainingCredits: number;
    duration: number;
    fps: number;
    background: string | null;
    music: string | null;
    assetType: string | null;
    outputType?: "video" | "audio";
  }) => void;
}

export const useGenerationType = create<useGenerationTypeProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  videoDetails: {
    mode: "brainrot",
    title: "",
    agents: [],
    cost: 0,
    remainingCredits: 0,
    duration: 0,
    fps: 0,
    background: null,
    music: null,
    assetType: null,
    outputType: "audio",
  },
  setVideoDetails: (videoDetails) => set({ videoDetails }),
}));
