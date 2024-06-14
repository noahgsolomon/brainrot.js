import { create } from "zustand";

interface UseCreateVideoProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isInQueue: boolean;
  setIsInQueue: (isInQueue: boolean) => void;
  invalidTopic: boolean;
  setInvalidTopic: (invalidTopic: boolean) => void;
  videoInput: string;
  setVideoInput: (videoInput: string) => void;
}

export const useCreateVideo = create<UseCreateVideoProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsInQueue: (isInQueue) => set({ isInQueue }),
  isInQueue: false,
  invalidTopic: false,
  setInvalidTopic: (invalidTopic) => set({ invalidTopic }),
  videoInput: "",
  setVideoInput: (videoInput) => set({ videoInput }),
}));
