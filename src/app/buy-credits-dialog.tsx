"use client";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCreateVideo } from "./usecreatevideo";
import { useYourVideos } from "./useyourvideos";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Coins,
  Crown,
  Folder,
  Github,
  Loader2,
  Minus,
  Plus,
  Star,
  Wand,
  X,
  Zap,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import Credits from "./credits";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import ProButton from "./ProButton";
import NumberTicker from "@/components/magicui/number-ticker";
import { useGenerationType } from "./usegenerationtype";
import ClientTweetCard from "@/components/magicui/client-tweet-card";
import XIcon from "@/components/svg/XIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  CardHeader,
} from "@/components/ui/card";

export default function BuyCreditsDialog() {
  const { mutate: createStripeSession } =
    trpc.user.createCreditPackSession.useMutation({
      onSuccess: ({ url }) => {
        if (url) window.location.href = url;
      },
    });

  const [showCredits, setShowCredits] = useState(false);
  const [creditPacks, setCreditPacks] = useState(1);
  const cost = creditPacks * 5;
  const totalCredits = creditPacks * 25;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="mt-2 flex w-full flex-row items-center justify-center gap-2"
          variant="outline"
        >
          Buy Credits <Coins className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Purchase Credits</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <p className="text-lg font-bold">{creditPacks * 25} credits</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={creditPacks <= 1}
                onClick={() => setCreditPacks((prev) => Math.max(1, prev - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center">{creditPacks}</span>
              <Button
                variant="outline"
                size="icon"
                disabled={creditPacks >= 10}
                onClick={() => setCreditPacks((prev) => Math.min(10, prev + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Each pack: 25 credits (~2-3 videos)
          </p>
          <div>
            <p className="text-lg font-bold">Total: ${creditPacks * 5}</p>
            <Button
              variant="default"
              onClick={() => createStripeSession({ creditPacks })}
              className="mt-2 flex w-full flex-row items-center justify-center gap-2"
            >
              Purchase Credits <Zap className="h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
