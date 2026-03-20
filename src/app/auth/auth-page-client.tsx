"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { useTRPC } from "@/trpc/client";
import {
  buildCreateVideoSearchQuery,
  type CreateVideoSearchParams,
} from "@/lib/create-video-search-params";

const Page = ({
  searchParams,
}: {
  searchParams: CreateVideoSearchParams;
}) => {
  const trpc = useTRPC();
  const existsMutation = useMutation(
    trpc.user.exists.mutationOptions({
      onSuccess: () => {
        const searchQueryString = buildCreateVideoSearchQuery({
          ...searchParams,
          loggedIn: "true",
        });
        window.location.href = `/${searchQueryString}`;
      },
      onError: () => {
        window.location.href = `/?error=true`;
      },
    }),
  );

  useEffect(() => {
    existsMutation.mutate();
  }, [existsMutation]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin " />
    </div>
  );
};

export default Page;
