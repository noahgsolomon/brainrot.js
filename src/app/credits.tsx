"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/trpc/client";
import { format } from "date-fns";
import { Coins, Crown, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import ProButton from "./ProButton";

export default function Credits() {
  const user = trpc.user.user.useQuery().data?.user;

  const { mutate: createStripeSession, isLoading } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: ({ url }) => {
        console.log("url " + url);
        if (url) window.location.href = url;
        if (!url) {
          toast.error("There was a problem...", {
            description: "Please try again later.",
          });
        }
      },
    });

  const subscriptionPlan = trpc.user.getSubscriptionPlan.useQuery().data;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={"outline"}
          className="flex flex-row items-center gap-2 text-lg"
        >
          <Coins className="h-5 w-5" />
          Credits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-4">
          <p className="text-2xl font-bold">
            Available Credits:{" "}
            <span className="text-destructive">{user?.credits ?? 0}</span>
          </p>
          <div>
            <p>
              {(user?.credits ?? 0 / 1000) * 100 < 25
                ? "Poor 😭"
                : (user?.credits ?? 0 / 1000) * 100 < 50
                ? "Average 🙂"
                : (user?.credits ?? 0 / 1000) * 100 < 75
                ? "Good 😏"
                : "Excellent 😎"}
            </p>
            <Progress value={(user?.credits ?? 0 / 1000) * 100} />
            <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-blue/80">
              <Info className="size-4 " />
              10 credits ≈ 1 video
            </div>
          </div>
          {/* <div className="relative flex flex-col gap-2">
            <div className="absolute inset-0 z-40 flex h-full w-full items-center justify-center rounded-lg bg-primary/50">
              <p className="text-center text-4xl font-bold text-secondary">
                COMING SOON
              </p>
            </div>
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
          </div> */}
          {!user?.subscribed ? (
            <ProButton>
              <Button
                data-action="subscribe"
                className={buttonVariants({
                  className:
                    "flex w-full flex-row items-center gap-2 text-secondary dark:text-primary ",
                  variant: "pink",
                  size: "xl",
                })}
              >
                GO PRO <Crown className="size-4" />
              </Button>
            </ProButton>
          ) : (
            <div className="flex flex-col gap-1">
              {subscriptionPlan?.isSubscribed ? (
                <p className="rounded-full text-xs font-medium">
                  {subscriptionPlan?.isCanceled
                    ? "Your plan will be canceled on "
                    : "Your plan renews on "}
                  {format(
                    subscriptionPlan?.stripeCurrentPeriodEnd!,
                    "MM.dd.yyyy",
                  )}
                  .
                </p>
              ) : null}
              <Button
                className="flex w-full flex-row items-center gap-2"
                onClick={() => createStripeSession()}
              >
                Manage Subscription
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
