"use client";

import { trpc } from "@/trpc/client";
import { ReactNode } from "react";

export default function ProButton({
  children,
  searchParams,
  searchQueryString,
}: {
  children: ReactNode;
  searchParams?: {
    agent1Id?: string;
    agent2Id?: string;
    agent1Name?: string;
    agent2Name?: string;
    title?: string;
    credits?: string;
    music?: string;
    background?: string;
    assetType?: string;
    duration?: string;
    fps?: string;
  };
  searchQueryString?: string;
}) {
  const { mutate: createStripeSession } =
    trpc.user.createStripeSession.useMutation({
      onSuccess: (data) => {
        window.location.href = data.url ?? "settings/billing";
      },
    });

  const obj = searchQueryString
    ? { searchQueryString }
    : searchParams
    ? { searchParams: searchParams }
    : undefined;

  return <div onClick={() => createStripeSession(obj)}>{children}</div>;
}
