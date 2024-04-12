"use client";
import { Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import ReactPlayer from "react-player";

export default function Page({ params }: { params: { pathId: string } }) {
  return (
    <main className="relative mt-[100px] flex w-[90%] flex-col items-center justify-center gap-4 bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
      <div className="overflow-hidden rounded-lg border">
        <Suspense fallback={<Loader2 className="size-6" />}>
          <video
            src={`https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${params.pathId}/out.mp4`}
            className={` rounded-lg shadow-md transition-all`}
            width={400}
            height={"100%"}
            controls
          ></video>
        </Suspense>
      </div>
    </main>
  );
}
