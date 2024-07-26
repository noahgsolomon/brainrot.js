"use client";

import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const Page = ({
  searchParams,
}: {
  searchParams: {
    // all for create video
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
}) => {
  const existsMutation = trpc.user.exists.useMutation({
    onSuccess: () => {
      const searchQueryString = `?loggedIn=true&agent1Id=${encodeURIComponent(
        searchParams.agent1Id || "",
      )}&agent2Id=${encodeURIComponent(
        searchParams.agent2Id || "",
      )}&agent1Name=${encodeURIComponent(
        searchParams.agent1Name || "",
      )}&agent2Name=${encodeURIComponent(
        searchParams.agent2Name || "",
      )}&title=${encodeURIComponent(
        searchParams.title || "",
      )}&credits=${encodeURIComponent(
        searchParams.credits || "",
      )}&music=${encodeURIComponent(
        searchParams.music || "",
      )}&background=${encodeURIComponent(
        searchParams.background || "",
      )}&assetType=${encodeURIComponent(
        searchParams.assetType || "",
      )}&duration=${encodeURIComponent(
        searchParams.duration || "",
      )}&fps=${encodeURIComponent(searchParams.fps || "")}`;
      window.location.href = `/${searchQueryString}`;
    },
    onError: () => {
      window.location.href = `/?error=true`;
    },
  });
  useEffect(() => {
    const mutation = () => {
      existsMutation.mutate();
    };
    mutation();
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin " />
    </div>
  );
};

export default Page;
