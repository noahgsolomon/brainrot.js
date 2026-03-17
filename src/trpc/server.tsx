import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";

import { type AppRouter, appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { makeQueryClient } from "./query-client";

export const getQueryClient = cache(makeQueryClient);
export const getCachedTRPCContext = cache(createTRPCContext);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  router: appRouter,
  ctx: getCachedTRPCContext,
  queryClient: getQueryClient,
});

type AnyQueryOptions = {
  queryKey: readonly unknown[];
  queryFn?: (...args: any[]) => unknown;
};

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export async function prefetchTRPC<TQueryOptions extends AnyQueryOptions>(
  queryOptions: TQueryOptions,
): Promise<void> {
  if (!queryOptions.queryFn) {
    return;
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(queryOptions as never);
}

export async function fetchTRPC<TQueryOptions extends AnyQueryOptions>(
  queryOptions: TQueryOptions,
): Promise<unknown> {
  if (!queryOptions.queryFn) {
    throw new Error("queryFn is required for fetchTRPC");
  }

  const queryClient = getQueryClient();
  return queryClient.fetchQuery(queryOptions as never);
}
