import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";
import { api } from "@/trpc/server";

type Props = {
  params: { pathId: string };
  searchParams: { [key: string]: string | undefined };
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  // read route params

  // const video = await api.user.findVideo.query({
  //   url: `https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${params.pathId}/out.mp4`,
  // });

  // https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/nuarmdkjh2/out.mp4

  // fetch data

  // optionally access and extend (rather than replace) parent metadata

  return {
    title: searchParams.title ?? "Unresolved Video",
    description: `${searchParams.title ?? "Unresolved Video"} explained by ${
      searchParams.agent1
        ? searchParams.agent1
            .split("_")
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(" ")
        : ""
    } and ${
      searchParams.agent2
        ? searchParams.agent2
            .split("_")
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(" ")
        : ""
    }`,
    openGraph: {
      images: ["https://images.smart.wtf/videoprev.png"],
    },
    twitter: {
      card: "summary_large_image",
      site: "brainrotjs.com",
      creator: "@noahgsolomon",
      title: searchParams.title ?? "Unresolved Video",
      description: `${searchParams.title ?? "Unresolved Video"} explained by ${
        searchParams.agent1
          ? searchParams.agent1
              .split("_")
              .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
              .join(" ")
          : ""
      } and ${
        searchParams.agent2
          ? searchParams.agent2
              .split("_")
              .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
              .join(" ")
          : ""
      }`,
      images: ["https://images.smart.wtf/videoprev.png"],
    },
  };
}

export default function Page({ params, searchParams }: Props) {
  return (
    <main className="relative mt-[120px] flex flex-col items-center justify-center gap-4 bg-opacity-60 text-4xl sm:mt-[100px]">
      <div className="overflow-hidden rounded-lg border">
        <Suspense fallback={<Loader2 className="size-6" />}>
          <video
            src={`https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${params.pathId}/out.mp4`}
            className={` w-[300px] rounded-lg shadow-md transition-all sm:w-[400px]`}
            width={400}
            height={"100%"}
            controls
          ></video>
        </Suspense>
      </div>
    </main>
  );
}
