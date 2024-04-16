import DiscordIcon from "@/components/svg/DiscordIcon";
import XIcon from "@/components/svg/XIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Coins,
  Copy,
  Crown,
  DollarSign,
  Gem,
  Info,
  PartyPopper,
} from "lucide-react";

export default function Credits() {
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
        <div className="absolute inset-0 z-40 flex h-full w-full items-center justify-center rounded-lg bg-primary/50">
          <p className="text-center text-4xl font-bold text-secondary">
            COMING SOON
          </p>
        </div>
        <div className="flex flex-col gap-8">
          <p className="text-2xl font-bold">
            Available Credits: <span className="text-destructive">43</span>
          </p>
          <div>
            <p>Moderate</p>
            <Progress value={(403 / 1000) * 100} />
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
