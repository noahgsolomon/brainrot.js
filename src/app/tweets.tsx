"use client";

import ClientTweetCard from "@/components/magicui/client-tweet-card";

export default function Tweets() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-36 ">
      <p className="text-2xl font-bold">Here's what you can make with our AI</p>
      <ClientTweetCard
        className=" bg-card/60 text-sm"
        id="1900595207172661360"
        video="https://cwp8pb7l7rzz6iyv.public.blob.vercel-storage.com/Etd5PUlku7lKa3zL.mp4"
        pfp="/pfp/brainrotpfp.jpg"
      />
      <ClientTweetCard
        className=" bg-card/60 text-sm"
        id="1893536210284372317"
        video="https://images.codefoli.com/squid.mp4"
        pfp="/pfp/noahpfp.jpg"
      />
      <ClientTweetCard
        className=" bg-card/60 text-sm"
        id="1889493561390792813"
        video="https://images.codefoli.com/jp.mp4"
        pfp="/pfp/noahpfp.jpg"
      />
    </div>
  );
}
