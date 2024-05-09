import { Button } from "@/components/ui/button";
import ProButton from "../ProButton";
import { BadgeCheck, Crown } from "lucide-react";
import Image from "next/image";

export default function Page() {
  return (
    <div className="flex h-screen w-screen flex-wrap items-center justify-center gap-4">
      <div>
        <div className="brain mx-auto mt-16 flex max-w-[90%] flex-col justify-between gap-8 rounded-lg border border-primary/20 bg-card p-4 text-secondary shadow-xl shadow-brain transition-all dark:text-primary sm:mt-0 sm:min-w-[400px]">
          <div className="flex flex-col gap-2">
            <h2>Brainrot Pro 🧠 </h2>
            <h1 className="text-5xl">
              $ 15<span className="text-base opacity-70"> / mo </span>
            </h1>
          </div>

          <div className="hidden flex-row gap-8 sm:flex">
            <Image
              className="rounded-lg border dark:border-primary"
              src={"https://images.smart.wtf/brainrot.png"}
              alt="holy shit"
              width={125}
              height={125}
            />
            <div className="flex flex-col gap-2">
              <div className="max-w-[200px] rounded-lg border bg-card/20 p-2 text-xs font-bold opacity-80 dark:border-primary dark:bg-primary/20">
                "I love brainrot.js like I love elk meat" - Joe Rogan
              </div>
              <div className="max-w-[200px] rounded-lg border bg-card/20 p-2 text-xs font-bold opacity-80 dark:border-primary dark:bg-primary/20">
                "brainrot.js is the archetypal weapon against neo-Marxist
                tyranny." - Jordan Peterson
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              <p>
                250 credits / month{" "}
                <span className="opacity-70">(~25 videos)</span>
              </p>
            </div>
            <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              My love and admiration
            </div>
            <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              all agents, 3+ min video, more (coming soon)
            </div>
            {/* <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              Access to all agents
            </div>
            <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              Up to 3 minute long videos
            </div> */}
            <div className="flex flex-row items-center gap-2">
              <BadgeCheck className="size-4 " />
              60 fps
            </div>
          </div>
          <ProButton>
            <Button
              size={"xl"}
              variant={"outline"}
              className="flex w-full flex-row items-center gap-2 hover:bg-card/40 hover:text-secondary hover:dark:text-primary "
            >
              GO PRO <Crown className="size-4" />
            </Button>
          </ProButton>
        </div>
      </div>
    </div>
  );
}
