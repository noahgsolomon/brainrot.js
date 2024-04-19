"use client";

import { trpc } from "@/trpc/client";
import { ReactNode } from "react";

export default function ProButton({ children }: { children: ReactNode }) {
  const { mutate: createStripeSession } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: ({ url }) => {
        window.location.href = url ?? "settings/billing";
      },
    });

  return <div onClick={() => createStripeSession()}>{children}</div>;
}
