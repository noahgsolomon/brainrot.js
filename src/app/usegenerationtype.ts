import { create } from "zustand";

/**
 * setVideoDetails({
                brainrot: {
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
                },
                math: {},
              });

              agent has name and id attributes
 */

interface useGenerationTypeProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  videoDetails: {
    mode: "brainrot" | "podcast" | "monologue";
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
        | "KAMALA_HARRIS";
      id: number;
    }[];
    cost: number;
    remainingCredits: number;
    duration: number;
    fps: number;
    background: string | null;
    music: string | null;
    assetType: string | null;
  };
  setVideoDetails: (videoDetails: {
    mode: "brainrot" | "podcast" | "monologue";
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
        | "KAMALA_HARRIS";
      id: number;
    }[];
    cost: number;
    remainingCredits: number;
    duration: number;
    fps: number;
    background: string | null;
    music: string | null;
    assetType: string | null;
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
  },
  setVideoDetails: (videoDetails) => set({ videoDetails }),
}));
