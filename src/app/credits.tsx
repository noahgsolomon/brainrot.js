"use client";

import DiscordIcon from "@/components/svg/DiscordIcon";
import XIcon from "@/components/svg/XIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/trpc/client";
import { Coins, Copy, Crown, Info } from "lucide-react";
import ProButton from "./ProButton";

export default function Credits() {
  const credits = trpc.user.user.useQuery().data?.user?.credits ?? 0;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={"outline"}
          className="flex flex-row items-center gap-2"
        >
          <Coins className="h-4 w-4" />
          Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        {/* <div className="absolute inset-0 z-40 flex h-full w-full items-center justify-center rounded-lg bg-primary/50">
          <p className="text-center text-4xl font-bold text-secondary">
            COMING SOON
          </p>
        </div> */}
        <div className="flex flex-col gap-8">
          <p className="text-2xl font-bold">
            Available Credits:{" "}
            <span className="text-destructive">{credits}</span>
          </p>
          <div>
            <p>
              {(credits / 1000) * 100 < 25
                ? "Poor 😭"
                : (credits / 1000) * 100 < 50
                ? "Average 🙂"
                : (credits / 1000) * 100 < 75
                ? "Good 😏"
                : "Excellent 😎"}
            </p>
            <Progress value={(credits / 1000) * 100} />
            <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-blue/80">
              <Info className="size-4 " />
              10 credits ≈ 1 video
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-bold">Get More</p>
            <div className="flex flex-row items-center gap-4">
              <Button
                variant={"outline"}
                className="flex flex-row items-center gap-1"
              >
                Invite friends <Copy className="size-4" />
              </Button>
              <div className="flex flex-col items-center justify-center xs:flex-row xs:gap-1">
                <p>+10 credits</p>
                <p className="text-sm text-primary/80">(per sign up)</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-4">
              <Button className="flex flex-row items-center gap-1 bg-[#7289da]  text-secondary hover:bg-[#7289da]/90 dark:text-primary">
                Join Discord{" "}
                <DiscordIcon
                  className={"size-4 fill-secondary dark:fill-primary"}
                />
              </Button>
              <p className="text-primary">+15 credits</p>
            </div>
            <div className="flex flex-row items-center gap-4">
              <Button
                variant={"lightMode"}
                className="flex flex-row items-center gap-1"
              >
                Follow us on{" "}
                <XIcon className={"size-4 fill-secondary dark:fill-primary"} />
              </Button>
              <p className="text-primary">+15 credits</p>
            </div>
          </div>
          or...
          <div
            className="flex flex-col gap-2
          "
          >
            <p className="font-bold">Get Serious 💪</p>
            <Button
              variant={"brain"}
              className="flex w-full flex-row items-center gap-2 "
            >
              GO PRO <Crown className="size-4" />
            </Button>
            <ProButton />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
