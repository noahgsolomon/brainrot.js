"use client";
import React, { useEffect, useRef, useState } from "react";
import { useAudioStore, AudioTrack } from "@/store/audioStore";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper function to format time in MM:SS format
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

export function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    toggle,
    pause,
    play,
    setCurrentTime,
    setVolume,
  } = useAudioStore();

  // Store previous volume level for unmuting
  const [prevVolume, setPrevVolume] = useState(1);

  // Toggle mute/unmute
  const toggleMute = () => {
    if (volume > 0) {
      // If not muted, store current volume and mute
      setPrevVolume(volume);
      setVolume(0);
    } else {
      // If muted, restore previous volume
      setVolume(prevVolume);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!currentTrack) return;

    // Create a temporary anchor element
    const anchor = document.createElement("a");
    anchor.href = currentTrack.src;

    // Extract filename from the URL or use the track title
    const filename = currentTrack.title
      ? `${currentTrack.title.replace(/[^\w\s]/gi, "")}.mp3`
      : currentTrack.src.split("/").pop() || "audio.mp3";

    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    // Trigger the download
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Hide the player if no track is selected
  if (!currentTrack) return null;

  // At this point, currentTrack is guaranteed to be non-null
  const track = currentTrack as AudioTrack;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background shadow-lg transition-transform duration-300 ease-in-out">
      <div className="container mx-auto px-4 py-4">
        {/* Progress bar at the top of the player */}
        <div className="mb-3">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={(value) => {
              if (value[0] !== undefined) {
                const newTime = (value[0] / 100) * duration;
                setCurrentTime(newTime);
              }
            }}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Playback controls */}
          <div className="flex items-center">
            <button
              className="rounded-full p-2.5 transition-colors hover:bg-accent"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Time indicators */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>

          {/* Track info */}
          <div className="min-w-0 flex-1 px-2">
            <div className="flex flex-col">
              <span className="truncate font-medium">
                {track.title || "Unknown Track"}
              </span>
              {track.subtitle && (
                <span className="truncate text-xs text-muted-foreground">
                  {track.subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Controls on the right */}
          <div className="flex items-center gap-2">
            {/* Volume control - simple mute/unmute button */}
            <button
              className="rounded-full p-2 transition-colors hover:bg-accent"
              onClick={toggleMute}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            {/* Download button */}
            <button
              className="rounded-full p-2 transition-colors hover:bg-accent"
              onClick={handleDownload}
              aria-label="Download audio"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
