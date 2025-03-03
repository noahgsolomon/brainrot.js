import { create } from "zustand";

export type AudioTrack = {
  id: string;
  title: string;
  subtitle?: string;
  src: string;
  duration?: number;
};

interface AudioState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioElement: HTMLAudioElement | null;

  // Actions
  play: (track?: AudioTrack) => void;
  pause: () => void;
  toggle: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  updateCurrentTime: (time: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  audioElement: null,

  play: (track) => {
    const state = get();

    // If a new track is provided, update the current track
    if (track && (!state.currentTrack || track.id !== state.currentTrack.id)) {
      // Clean up existing audio element if it exists
      if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement.src = "";
      }

      // Create new audio element
      const audio = new Audio(track.src);
      audio.volume = state.volume;

      // Set up event listeners
      audio.addEventListener("timeupdate", () => {
        get().updateCurrentTime(audio.currentTime);
      });

      audio.addEventListener("loadedmetadata", () => {
        get().setDuration(audio.duration);
      });

      audio.addEventListener("ended", () => {
        set({ isPlaying: false, currentTime: 0 });
      });

      // Play the audio
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });

      set({
        currentTrack: track,
        audioElement: audio,
        isPlaying: true,
        currentTime: 0,
      });
    } else if (state.audioElement) {
      // Resume playing current track
      state.audioElement.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      set({ isPlaying: true });
    }
  },

  pause: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      set({ isPlaying: false });
    }
  },

  toggle: () => {
    const { isPlaying, audioElement, currentTrack } = get();
    if (isPlaying) {
      get().pause();
    } else if (currentTrack) {
      get().play();
    }
  },

  setCurrentTime: (time) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.currentTime = time;
      set({ currentTime: time });
    }
  },

  updateCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setVolume: (volume) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.volume = volume;
    }
    set({ volume });
  },

  setDuration: (duration) => {
    set({ duration });
  },
}));
