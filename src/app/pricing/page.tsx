"use client";
import { Button } from "@/components/ui/button";
import { Crown, BadgeCheck, Coins, Plus, Minus, Zap } from "lucide-react";
import Image from "next/image";
import ProButton from "../ProButton";
import { useState } from "react";
import { trpc } from "@/trpc/client";

export default function Page() {
  const [creditPacks, setCreditPacks] = useState(1);
  const cost = creditPacks * 5;
  const totalCredits = creditPacks * 25;

  const { mutate: createStripeSession } =
    trpc.user.createCreditPackSession.useMutation({
      onSuccess: ({ url }) => {
        if (url) window.location.href = url;
      },
    });

  const { mutate: createProSubscription } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: ({ url }) => {
        if (url) window.location.href = url;
      },
    });

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-20">
      <div className="grid max-w-6xl gap-8 md:grid-cols-2">
        {/* Credit Packs Card */}
        <div className="brain flex h-[500px] w-full max-w-[400px] flex-col rounded-lg border border-primary/20 bg-card p-6 text-secondary shadow-xl shadow-brain transition-all dark:text-primary">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-2xl">
                Credit Packs <span className="text-xl">💳</span>
              </h2>
              <div className="flex items-end gap-2">
                <h1 className="text-5xl">$ {cost}</h1>
                <p className="mb-2 opacity-70">one-time</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    <p className="text-lg font-bold">{totalCredits} credits</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={creditPacks <= 1}
                      onClick={() =>
                        setCreditPacks((prev) => Math.max(1, prev - 1))
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={creditPacks >= 10}
                      onClick={() =>
                        setCreditPacks((prev) => Math.min(10, prev + 1))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm opacity-70">
                  Each pack contains 25 credits (~2-3 videos)
                </p>
              </div>
            </div>
          </div>

          <Button
            size="xl"
            variant="outline"
            onClick={() => createStripeSession({ creditPacks })}
            className="w-full hover:bg-card/40 hover:text-secondary hover:dark:text-primary"
          >
            Purchase Credits <Zap className="h-4" />
          </Button>
        </div>

        {/* Pro Plan Card */}
        <div className="brain flex h-[500px] w-full max-w-[400px] flex-col rounded-lg border border-primary/20 bg-card p-6 text-secondary shadow-xl shadow-brain transition-all dark:text-primary">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-2xl">
                Brainrot Pro <span className="text-xl">🧠</span>
              </h2>
              <div className="flex items-end gap-2">
                <h1 className="text-5xl">$ 15</h1>
                <p className="mb-2 opacity-70">/ mo</p>
              </div>
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                <p>250 credits / month (~25 videos)</p>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                My love and admiration
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                all agents, 3+ min video, more (coming soon)
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                60 fps
              </div>
            </div>
          </div>

          <Button
            size="xl"
            variant="outline"
            onClick={() => createProSubscription()}
            className="flex w-full flex-row items-center justify-center gap-2 hover:bg-card/40 hover:text-secondary hover:dark:text-primary"
            data-action="subscribe"
          >
            GO PRO <Crown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
