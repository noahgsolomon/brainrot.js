import { create } from "zustand";

interface UseCreateVideoProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invalidTopic: boolean;
  setInvalidTopic: (invalidTopic: boolean) => void;
  videoInput: string;
  setVideoInput: (videoInput: string) => void;
  submittedAgents: string[];
  setSubmittedAgents: (agents: string[]) => void;
  submittedTitle: string;
  setSubmittedTitle: (title: string) => void;
  clearSubmittedVideo: () => void;
}

export const useCreateVideo = create<UseCreateVideoProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  invalidTopic: false,
  setInvalidTopic: (invalidTopic) => set({ invalidTopic }),
  videoInput: "",
  setVideoInput: (videoInput) => set({ videoInput }),
  submittedAgents: [],
  setSubmittedAgents: (agents) => set({ submittedAgents: agents }),
  submittedTitle: "",
  setSubmittedTitle: (title) => set({ submittedTitle: title }),
  clearSubmittedVideo: () =>
    set({
      submittedAgents: [],
      submittedTitle: "",
    }),
}));
