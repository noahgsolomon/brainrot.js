import { create } from "zustand";

interface UseCreateVideoProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isInQueue: boolean;
  setIsInQueue: (isInQueue: boolean) => void;
}

export const useCreateVideo = create<UseCreateVideoProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setIsInQueue: (isInQueue) => set({ isInQueue }),
  isInQueue: false,
}));
