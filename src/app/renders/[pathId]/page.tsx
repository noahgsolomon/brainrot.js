"use client";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { pathId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  // read route params
  const id = params.pathId;

  // https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/nuarmdkjh2/out.mp4

  // fetch data
  const product = await fetch(
    `https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${id}/out.mp4`,
  ).then((res) => res.json());

  // optionally access and extend (rather than replace) parent metadata

  return {
    title: id,
    openGraph: {
      images: ["https://images.smart.wtf/fluffingduck.png"],
    },
  };
}

export default function Page({ params, searchParams }: Props) {
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
