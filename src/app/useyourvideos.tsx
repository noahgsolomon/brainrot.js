import { create } from "zustand";

interface useYourVideosProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useYourVideos = create<useYourVideosProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
