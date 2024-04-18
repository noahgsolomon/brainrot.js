"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";

export default function ProButton() {
  const { mutate: createStripeSession } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: ({ url }) => {
        window.location.href = url ?? "settings/billing";
      },
    });

  return <Button onClick={() => createStripeSession()}>sup</Button>;
}
