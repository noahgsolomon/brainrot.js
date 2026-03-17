import Image from "next/image";
import NumberTicker from "@/components/magicui/number-ticker";
import type { RouterOutput } from "@/trpc/client";
import {
  HydrateClient,
  fetchTRPC,
  prefetchTRPC,
  trpc,
} from "@/trpc/server";
import {
  normalizeCreateVideoSearchParams,
  type RawSearchParams,
} from "@/lib/create-video-search-params";
import PageClient from "./page-client";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import ProButton from "./ProButton";
import { Crown } from "lucide-react";
import BuyCreditsDialog from "./buy-credits-dialog";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams =
    normalizeCreateVideoSearchParams(await searchParams);
  const clerkUser = await currentUser();

  const userDB = clerkUser
    ? ((await fetchTRPC(
        trpc.user.user.queryOptions(),
      )) as RouterOutput["user"]["user"])
    : null;

  const prefetches = [
    prefetchTRPC(trpc.user.activeQueueCount.queryOptions()),
    prefetchTRPC(trpc.user.getLatestGenerations.queryOptions()),
  ];

  if (clerkUser) {
    prefetches.push(
      prefetchTRPC(trpc.user.videoStatus.queryOptions()),
      prefetchTRPC(trpc.user.userVideos.queryOptions()),
      prefetchTRPC(trpc.user.getSubscriptionPlan.queryOptions()),
    );
  }

  await Promise.all(prefetches);

  return (
    <HydrateClient>
      <main className="relative flex flex-col items-center justify-center gap-4">
        <div className="mt-[140px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
          <div className="flex flex-col items-center justify-center gap-8 pb-8">
            {/* <div className="coarse:hidden">
            <FlyingGifs gifs={gifs} />
          </div> */}
            {/* <Link
              className="flex flex-col items-center gap-1"
              href="https://www.producthunt.com/products/brainrot-js"
              target="_blank"
            >
              <img
                className="h-[43px] w-[200]"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=455445&theme=light"
                alt="Brainrot&#0046;js - Rot&#0032;your&#0032;brain&#0032;one&#0032;AI&#0032;generated&#0032;video&#0032;at&#0032;a&#0032;time&#0046; | Product Hunt"
              />
            </Link> */}
            {/* <Link
              href={"https://github.com/noahgsolomon/brainrot.js"}
              target="_blank"
            >
              <AnimatedGradientText className="cursor-pointer">
                ⭐ <hr className="mx-2 h-4 w-[1px] shrink-0 bg-gray-300" />{" "}
                <span
                  className={cn(
                    `inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                  )}
                >
                  Star on GitHub
                </span>
              </AnimatedGradientText>
            </Link> */}

            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-row items-center justify-center gap-3">
                <Link href={"https://x.com/brainrotjs"} target="_blank">
                  <Image
                    title="Brainrot"
                    src={"/brainrot_new2.png"}
                    width={48}
                    height={48}
                    alt="brainrot"
                    className="h-[48px] w-[48px] cursor-pointer rounded-full border-card bg-background shadow-lg transition-all hover:scale-[105%] active:scale-[95%] dark:border-primary"
                  />
                </Link>
                <h1 className="relative text-center text-5xl font-bold lg:text-6xl">
                  BRAINROT
                </h1>
              </div>
              <p className="mt-1 max-w-[300px] text-center text-lg text-muted-foreground">
                Turn any topic into a viral short-form video in seconds
              </p>
              <p className="flex w-full flex-row items-center justify-center gap-1 text-base font-normal italic">
                <NumberTicker value={59324} /> videos generated 💀
              </p>
            </div>

            <PageClient
              searchParams={resolvedSearchParams}
              initialSignedIn={Boolean(clerkUser)}
            />
            {userDB && userDB?.user ? (
              <div className="flex w-80 flex-col gap-3">
                {userDB?.user?.subscribed ? null : (
                  <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                    <h3 className="text-base font-semibold text-secondary-foreground">
                      Go Pro
                    </h3>
                    <p className="text-sm text-secondary-foreground/80">
                      Generate 25 videos, 60 FPS, all agents, perfect subtitles
                    </p>
                    <ProButton>
                      <Button
                        data-action="subscribe"
                        className="mt-1 flex w-full flex-row items-center justify-center gap-2"
                        size="lg"
                      >
                        GO PRO <Crown className="size-4" />
                      </Button>
                    </ProButton>
                  </div>
                )}
                <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                  <h3 className="text-base font-semibold text-secondary-foreground">
                    Buy Credits
                  </h3>
                  <p className="text-sm text-secondary-foreground/80">
                    Purchase credits for individual videos
                  </p>
                  <BuyCreditsDialog />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {/* <p className="max-w-[300px] pt-12 text-center italic">
          To anyone who supports us on{" "}
          <Link
            target="_blank"
            className="underline"
            href={"https://www.producthunt.com/products/brainrot-js"}
          >
            Product Hunt
          </Link>
          ... I will kiss u fr 😽
        </p> */}
      </main>
      {/* <footer className="flex w-screen justify-center border-t border-border bg-secondary px-4 py-4">
        <div className="flex w-full items-center justify-between px-[5%] py-1 md:px-[10%]">
          <Image
            src={"/brainrot_new2.png"}
            width={64}
            height={64}
            alt="brainrot"
            className="cursor-pointer rounded-full border border-card shadow-lg transition-all hover:scale-[101%] active:scale-[99%] dark:border-primary"
          />
          <div className="flex flex-row items-center justify-center gap-2">
            <Link href={"https://github.com/noahgsolomon/brainrot.js"}>
              <Github className="size-6" />
            </Link>
            <Link href={"https://twitter.com/brainrotjs"}>
              <XIcon className="size-6 fill-primary" />
            </Link>
          </div>
        </div>
      </footer> */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Brainrot.js",
            description:
              "The #1 AI-powered brainrot maker and video generator. Create hilarious brainrot videos with celebrity voices, AI dialogue, and viral memes.",
            url: "https://brainrotjs.com",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Any",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: "0",
              highPrice: "19.99",
              offerCount: "3",
              offers: [
                {
                  "@type": "Offer",
                  name: "Free Credits",
                  price: "0",
                  description: "Start creating with free credits",
                },
                {
                  "@type": "Offer",
                  name: "20 Credits Pack",
                  price: "1.99",
                  description: "Generate 20 brainrot videos",
                },
                {
                  "@type": "Offer",
                  name: "Pro Subscription",
                  price: "19.99",
                  description: "Unlimited video generation per month",
                },
              ],
            },
            creator: {
              "@type": "Person",
              name: "Noah Solomon",
              url: "https://twitter.com/noahgsolomon",
            },
            publisher: {
              "@type": "Organization",
              name: "Brainrot.js",
              logo: {
                "@type": "ImageObject",
                url: "https://brainrotjs.com/brainrot_new2.png",
              },
              sameAs: [
                "https://twitter.com/brainrotjs",
                "https://twitter.com/noahgsolomon",
              ],
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "1000",
              bestRating: "5",
              worstRating: "1",
            },
            featureList: [
              "AI-powered video generation",
              "Celebrity voice synthesis",
              "Viral meme creation",
              "Instant video rendering",
              "Multiple video styles",
              "Background music selection",
              "Custom dialogue generation",
            ],
            screenshot: [
              "https://brainrotjs.com/brainrot-style.png",
              "https://brainrotjs.com/podcast-style.png",
              "https://brainrotjs.com/rap-style.png",
              "https://brainrotjs.com/monologue-style.png",
            ],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is Brainrot.js?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Brainrot.js is an AI-powered video generator that creates viral brainrot content with celebrity voices, memes, and funny dialogues. It's the #1 tool for creating entertaining videos for social media.",
                },
              },
              {
                "@type": "Question",
                name: "How do I create a brainrot video?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Simply choose your video style (brainrot, podcast, rap, or monologue), select celebrity characters, enter your topic or dialogue, and click generate. Your video will be ready in seconds!",
                },
              },
              {
                "@type": "Question",
                name: "Is Brainrot.js free to use?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes! Brainrot.js offers free credits to get started. You can create videos for free and purchase additional credits or subscribe to Pro for unlimited generation.",
                },
              },
              {
                "@type": "Question",
                name: "What celebrities can I use in my videos?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Brainrot.js offers a variety of celebrity voices including politicians, influencers, and public figures. The voices are AI-generated for entertainment purposes.",
                },
              },
            ],
          }),
        }}
      />
    </HydrateClient>
  );
}
