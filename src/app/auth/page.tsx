import { api } from "@/trpc/server";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";

const Page = async () => {
  await api.user.exists.mutate();
  redirect("/?loggedIn=true");

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
};

export default Page;
