"use client";

import { createTRPCContext } from "@trpc/tanstack-react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";

import { type AppRouter } from "@/server/api/root";

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export function getUrl() {
  if (typeof window !== "undefined") {
    return "/api/trpc";
  }

  if (process.env.MODE === "PROD") {
    return `https://${process.env.WEBSITE}/api/trpc`;
  }

  return "http://localhost:3000/api/trpc";
}
