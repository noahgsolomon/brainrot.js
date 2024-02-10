import { create } from "zustand";

interface UseCreateVideoProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useCreateVideo = create<UseCreateVideoProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
