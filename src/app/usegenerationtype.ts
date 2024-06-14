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
    brainrot: {
      title: string;
      agents: {
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
      }[];
      cost: number;
      remainingCredits: number;
      duration: number;
      fps: number;
      background: string | null;
      music: string | null;
      assetType: string | null;
    };
    math: {};
  };
  setVideoDetails: (videoDetails: {
    brainrot: {
      title: string;
      agents: {
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
      }[];
      cost: number;
      remainingCredits: number;
      duration: number;
      fps: number;
      background: string | null;
      music: string | null;
      assetType: string | null;
    };
    math: {};
  }) => void;
}

export const useGenerationType = create<useGenerationTypeProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  videoDetails: {
    brainrot: {
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
    math: {},
  },
  setVideoDetails: (videoDetails) => set({ videoDetails }),
}));
