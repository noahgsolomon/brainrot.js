"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type getUserSubscriptionPlan } from "@/lib/stripe";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BillingFormProps {
  subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>;
}

const BillingForm = ({ subscriptionPlan }: BillingFormProps) => {
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createStripeSession();
      }}
    >
      <Card className="p-4 shadow-none sm:min-w-[500px]">
        <CardHeader className="pb-20">
          <CardTitle>Subscription Plan</CardTitle>
          {/* <CardDescription>
            You are currently on the{" "}
            <strong>{subscriptionPlan.name ?? "FREE"}</strong> plan.
          </CardDescription> */}
        </CardHeader>
        <CardFooter className="flex flex-col items-start space-y-2 md:flex-row md:justify-between md:space-x-4">
          <Button type="submit" className="py-6">
            {isLoading ? (
              <Loader2 className="mr-4 h-4 w-4 animate-spin" />
            ) : null}
            {subscriptionPlan.isSubscribed
              ? "Manage Subscription"
              : "Upgrade to PRO"}
          </Button>

          {subscriptionPlan.isSubscribed ? (
            <p className="rounded-full text-xs font-medium">
              {subscriptionPlan.isCanceled
                ? "Your plan will be canceled on "
                : "Your plan renews on "}
              {format(subscriptionPlan.stripeCurrentPeriodEnd!, "MM.dd.yyyy")}.
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </form>
  );
};

export default BillingForm;
