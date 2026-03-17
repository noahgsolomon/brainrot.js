import { create } from "zustand";

interface UseCreateVideoProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invalidTopic: boolean;
  setInvalidTopic: (invalidTopic: boolean) => void;
  videoInput: string;
  setVideoInput: (videoInput: string) => void;
  submittedAgent1: string;
  setSubmittedAgent1: (agent: string) => void;
  submittedAgent2: string;
  setSubmittedAgent2: (agent: string) => void;
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
  submittedAgent1: "",
  setSubmittedAgent1: (agent) => set({ submittedAgent1: agent }),
  submittedAgent2: "",
  setSubmittedAgent2: (agent) => set({ submittedAgent2: agent }),
  submittedTitle: "",
  setSubmittedTitle: (title) => set({ submittedTitle: title }),
  clearSubmittedVideo: () =>
    set({
      submittedAgent1: "",
      submittedAgent2: "",
      submittedTitle: "",
    }),
}));
