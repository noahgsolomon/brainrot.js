import Image from "next/image";
import NumberTicker from "@/components/magicui/number-ticker";
import { api } from "@/trpc/server";
import PageClient from "./page-client";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Tweets from "./tweets";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

            <Link href={"https://x.com/brainrotjs"}>
              <Image
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
                  <NumberTicker value={29521} /> videos generated 💀
                </p>
              </div>
              {/* Deep Fish Promo Bar */}
              <div className="relative mt-2 w-full max-w-xs">
                <Link
                  href="https://deepfi.sh"
                  target="_blank"
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className:
                        "group inline-flex w-full items-center justify-between gap-3 pl-5",
                    }),
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Image
                      src="/deepfish.png"
                      width={24}
                      height={24}
                      alt="Deep Fish logo"
                      className="animate-bounce rounded-full"
                    />
                    <span>
                      Build AI flows w/
                      <span className="pl-1 underline decoration-primary/30 underline-offset-4">
                        Deep Fish
                      </span>
                    </span>
                  </div>
                  <span className="text-sm font-medium transition-colors group-hover:text-accent-foreground">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* {userDB && userDB?.user ? (
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
            ) : null} */}
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
    </>
  );
}
