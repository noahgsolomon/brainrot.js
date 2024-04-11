"use client";
import { useEffect, useState } from "react";

type FlyingGif = {
  url: string;
  startSide: "left";
  width: number;
  height: number;
  top: string;
  animationDelay: string;
  left?: string;
  speed: number;
};

export default function FlyingGifs({ gifs }: { gifs: string[] }) {
  const [flyingGifs, setFlyingGifs] = useState<FlyingGif[]>([]);
  const [resampleKey, setResampleKey] = useState(0);

  useEffect(() => {
    const sampleGifs = () => {
      const sampleSize = 10;
      const sampledGifs: FlyingGif[] = [];

      // Clear the current GIFs
      setFlyingGifs([]);

      for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * gifs.length);
        const gif = gifs[randomIndex] ?? "/par.gif";

        const randomVal = Math.floor(Math.random() * 100) + 50;
        const offScreenPosition = `${-1000 * Math.random()}px`;

        sampledGifs.push({
          url: gif,
          startSide: "left",
          width: randomVal,
          height: randomVal,
          top: `${Math.random() * 500 + 50}px`,
          left: offScreenPosition,
          animationDelay: "0s",
          speed: 10 * Math.random() + 20,
        });
      }

      setFlyingGifs(sampledGifs);
      setResampleKey((prevKey) => prevKey + 1);
    };

    sampleGifs();
    const intervalId = setInterval(sampleGifs, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [gifs]);

  return (
    <>
      {flyingGifs.map((gif, index) => {
        const animationName =
          gif.startSide === "left" ? "slideInFromLeft" : "slideInFromRight";
        return (
          <div
            key={`${resampleKey}-${index}`}
            style={{
              width: gif.width,
              height: gif.height,
              backgroundImage: `url(${gif.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              animation: `${animationName} ${gif.speed}s linear ${gif.animationDelay}`,
              position: "absolute",
              top: gif.top,
              left: gif.left,
            }}
            className={`group -z-10 flex-col items-stretch justify-between overflow-hidden rounded-lg p-4 transition-all`}
          />
        );
      })}
    </>
  );
}
