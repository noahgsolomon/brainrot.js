"use client";

import { trpc } from "@/trpc/client";
import { api } from "@/trpc/server";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const Page = () => {
  const existsMutation = trpc.user.exists.useMutation({
    onSuccess: () => {
      window.location.href = "/?loggedIn=true";
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
