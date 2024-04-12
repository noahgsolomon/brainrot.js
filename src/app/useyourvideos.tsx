import { create } from "zustand";

interface useYourVideosProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  refetchVideos: boolean;
  setRefetchVideos: (refetch: boolean) => void;
  isNewOpen: boolean;
  setIsNewOpen: (isNewOpen: boolean) => void;
}

export const useYourVideos = create<useYourVideosProps>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  refetchVideos: false,
  setRefetchVideos: (refetch) => set({ refetchVideos: refetch }),
  isNewOpen: false,
  setIsNewOpen: (isNewOpen) => set({ isNewOpen }),
}));
