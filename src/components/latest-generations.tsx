"use client";

import { useRef, useState, useCallback } from "react";
import { trpc } from "@/trpc/client";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

function VideoCard({
  video,
}: {
  video: {
    id: number;
    title: string;
    url: string;
    thumbnail: string;
    agent1: string;
    agent2: string;
  };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsMuted(true);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleVideoReady = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      if (videoRef.current) {
        videoRef.current.muted = prev;
      }
      return !prev;
    });
  }, []);

  return (
    <div
      className="relative flex w-[180px] shrink-0 cursor-pointer flex-col gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border bg-card/50">
        {/* Thumbnail — always rendered, fades out on hover */}
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className={`object-cover transition-opacity duration-200 ${
            isHovered ? "opacity-0" : "opacity-100"
          }`}
          sizes="180px"
        />

        {/* Video — only mounts on hover */}
        {isHovered && (
          <>
            <video
              ref={videoRef}
              src={video.url}
              muted
              playsInline
              loop
              onLoadedData={handleVideoReady}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <button
              onClick={toggleMute}
              className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </>
        )}
      </div>

      <p className="line-clamp-2 text-xs font-medium text-foreground/80">
        {video.title}
      </p>
    </div>
  );
}

export default function LatestGenerations() {
  const { data, isLoading } = trpc.user.getLatestGenerations.useQuery(
    undefined,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  );

  const videos = data?.videos;

  if (isLoading || !videos || videos.length === 0) return null;

  const duration = `${Math.max(20, videos.length * 3)}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8 flex w-full max-w-4xl flex-col items-center gap-3"
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Latest Generations
      </h2>
      <div
        className="group relative flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        style={
          { "--duration": duration, "--gap": "1rem" } as React.CSSProperties
        }
      >
        {/* First copy */}
        <div className="flex shrink-0 animate-marquee items-start gap-[--gap] group-hover:[animation-play-state:paused]">
          {videos.map((video) => (
            <VideoCard key={`a-${video.id}`} video={video as any} />
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div
          className="flex shrink-0 animate-marquee items-start gap-[--gap] group-hover:[animation-play-state:paused]"
          aria-hidden
        >
          {videos.map((video) => (
            <VideoCard key={`b-${video.id}`} video={video as any} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
