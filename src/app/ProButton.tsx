"use client";

import { useMutation } from "@tanstack/react-query";
import { ReactNode } from "react";

import { useTRPC } from "@/trpc/client";

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
  const trpc = useTRPC();

  const { mutate: createStripeSession } = useMutation(
    trpc.user.createStripeSession.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.url ?? "settings/billing";
      },
    }),
  );

  const obj = searchQueryString
    ? { searchQueryString }
    : searchParams
    ? { searchParams: searchParams }
    : undefined;

  return <div onClick={() => createStripeSession(obj)}>{children}</div>;
}
