"use client";

import { trpc } from "@/trpc/client";
import { ReactNode } from "react";

export default function ProButton({ children }: { children: ReactNode }) {
  const { mutate: createStripeSession } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: (data) => {
        console.log("PRO BUTTON TSX " + JSON.stringify(data, null, 2));
        window.location.href = data.url ?? "settings/billing";
      },
    });

  return <div onClick={() => createStripeSession()}>{children}</div>;
}
