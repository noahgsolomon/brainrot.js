import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { type Metadata } from "next";
import {
  getSingleSearchParam,
  type RawSearchParams,
} from "@/lib/create-video-search-params";
import {
  formatSpeakerNames,
  resolveSpeakerNames,
} from "@/lib/brainrot-speakers";

type Props = {
  params: Promise<{ pathId: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const title = getSingleSearchParam(resolvedSearchParams.title);
  const agent1 = getSingleSearchParam(resolvedSearchParams.agent1);
  const agent2 = getSingleSearchParam(resolvedSearchParams.agent2);
  const agents = resolveSpeakerNames(
    getSingleSearchParam(resolvedSearchParams.agents),
    [agent1, agent2],
  );
  const speakerSummary = formatSpeakerNames(agents);
  // read route params

  // const video = await api.user.findVideo.query({
  //   url: `https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${params.pathId}/out.mp4`,
  // });

  // https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/nuarmdkjh2/out.mp4

  // fetch data

  return {
    title: title ?? "Unresolved Video",
    description: speakerSummary
      ? `${title ?? "Unresolved Video"} explained by ${speakerSummary}`
      : title ?? "Unresolved Video",
    openGraph: {
      images: ["/brainrot_new2.png"],
    },
    twitter: {
      card: "summary_large_image",
      site: "brainrotjs.com",
      creator: "@noahgsolomon",
      title: title ?? "Unresolved Video",
      description: speakerSummary
        ? `${title ?? "Unresolved Video"} explained by ${speakerSummary}`
        : title ?? "Unresolved Video",
      images: ["/brainrot_new2.png"],
    },
  };
}

export default async function Page({ params }: Props) {
  const { pathId } = await params;
  return (
    <main className="relative mt-[120px] flex flex-col items-center justify-center gap-4 bg-opacity-60 text-4xl sm:mt-[100px]">
      <div className="overflow-hidden rounded-lg border">
        <Suspense fallback={<Loader2 className="size-6" />}>
          <video
            src={`https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-oaz2rkh49x/renders/${pathId}/out.mp4`}
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
