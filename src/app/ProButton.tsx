"use client";

import { useMutation } from "@tanstack/react-query";
import { ReactNode } from "react";

import type { CreateVideoSearchParams } from "@/lib/create-video-search-params";
import { useTRPC } from "@/trpc/client";

export default function ProButton({
  children,
  searchParams,
  searchQueryString,
}: {
  children: ReactNode;
  searchParams?: CreateVideoSearchParams;
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
