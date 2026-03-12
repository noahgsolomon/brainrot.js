import Image from "next/image";
import NumberTicker from "@/components/magicui/number-ticker";
import { api } from "@/trpc/server";
import PageClient from "./page-client";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Tweets from "./tweets";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import ProButton from "./ProButton";
import { Crown } from "lucide-react";
import BuyCreditsDialog from "./buy-credits-dialog";

export default async function Home({
  searchParams,
}: {
  searchParams: {
    error?: string;
    loggedIn?: string;
    subscribed?: string;
    // all for create video
    agent1Id?: string;
    agent2Id?: string;
    agent1Name?: string;
    agent2Name?: string;
    title?: string;
    credits?: string;
    music?: string;
    background?: string;
    assetType?: string;
    duration?: string;
    fps?: string;
  };
}) {
  let userDB;
  let pendingVideo = false;
  let clerkUser;
  try {
    userDB = await api.user.user.query();
    clerkUser = await currentUser();
    const videoStatus = await api.user.videoStatus.query();
    pendingVideo =
      videoStatus?.videos !== null && videoStatus?.videos !== undefined;
  } catch (e) {
    userDB = null;
  }

  const safeUserData = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      }
    : null;

  return (
    <>
      <main className="relative flex flex-col items-center justify-center gap-4">
        <div className="mt-[100px] flex w-[90%] flex-col items-center justify-center bg-opacity-60 text-4xl lg:w-[80%] xl:w-[75%]">
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

            <Link href={"https://x.com/brainrotjs"} target="_blank">
              <Image
                title="Brainrot"
                src={"/brainrot_new2.png"}
                width={200}
                height={200}
                alt="brainrot"
                className="h-[200px] w-[200px] cursor-pointer rounded-full border-card bg-background shadow-lg transition-all hover:scale-[101%] active:scale-[99%] dark:border-primary coarse:h-[150px] coarse:w-[150px] coarse:border-[5px]"
              />
            </Link>

            <div className=" flex flex-col items-center gap-2">
              <div>
                <h1 className="relative max-w-[10ch] text-center text-5xl font-bold lg:text-6xl">
                  BRAINROT
                </h1>
                <p className="flex w-full flex-row items-center justify-center gap-1 p-2 text-base font-normal italic">
                  <NumberTicker value={59324} /> videos generated 💀
                </p>
              </div>
            </div>

            {userDB && userDB?.user ? (
              <Card
                className={` ${
                  !userDB?.user?.subscribed
                    ? "max-w-xl"
                    : "flex flex-col items-center justify-center"
                } border-none bg-transparent shadow-none`}
              >
                <CardContent>
                  <div
                    className={`grid w-full gap-6 pt-4 ${
                      !userDB?.user?.subscribed ? "sm:grid-cols-2" : ""
                    }`}
                  >
                    {userDB?.user?.subscribed ? null : (
                      <div className="flex flex-col justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                        <h3 className="text-lg font-semibold text-secondary-foreground">
                          Go Pro
                        </h3>
                        <div className="flex flex-col items-start gap-2">
                          <p className="text-sm text-secondary-foreground/80">
                            Generate 25 videos, 60 FPS, all agents, perfect
                            subtitles
                          </p>
                        </div>
                        <ProButton>
                          <Button
                            data-action="subscribe"
                            className="mt-2 flex w-full flex-row items-center justify-center gap-2"
                            size="lg"
                          >
                            GO PRO <Crown className="size-4" />
                          </Button>
                        </ProButton>
                      </div>
                    )}

                    <div className="flex flex-col justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                      <h3 className="text-lg font-semibold text-secondary-foreground">
                        Buy Credits
                      </h3>
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-sm text-secondary-foreground/80">
                          Purchase credits for individual videos
                        </p>
                      </div>
                      <BuyCreditsDialog />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <PageClient
              searchParams={searchParams}
              initialPendingVideo={pendingVideo}
              clerkUser={safeUserData}
            />
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
            src={"https://images.smart.wtf/brainrot.png"}
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
      <Tweets />

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
    </>
  );
}
