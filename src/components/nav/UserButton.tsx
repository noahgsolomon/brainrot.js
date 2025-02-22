"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { trpc } from "@/trpc/client";
import Link from "next/link";
import { Landmark, Twitter } from "lucide-react";
import { toast } from "react-hot-toast";

const UserButton = () => {
  const user = useUser();
  const clerk = useClerk();
  const userDB = trpc.user.user.useQuery();

  const disconnectTwitterMutation = trpc.user.disconnectTwitter.useMutation({
    onSuccess: () => {
      userDB.refetch();
      toast.success("Twitter disconnected successfully");
    },
    onError: (error) => {
      toast.error("Failed to disconnect Twitter");
    },
  });

  const logOutHandler = async () => {
    await clerk.signOut();
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full transition-all hover:opacity-80 focus:outline-0">
        <Avatar className="border border-border">
          <AvatarImage
            className={`object-cover transition-all`}
            src={userDB.data?.user?.pfp ?? user.user?.imageUrl}
          />
          <AvatarFallback>{userDB.data?.user?.name.at(0)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mx-10 min-w-[300px] p-0">
        <DropdownMenuLabel className="gap-4 border-b border-border p-2">
          <div>
            <h3 className="text-base">{userDB.data?.user?.name}</h3>
            <p className="text-sm opacity-60">@{userDB.data?.user?.username}</p>
          </div>
        </DropdownMenuLabel>
        {/* <Link href="/settings/achievements">
          <DropdownMenuItem className="mx-1 my-1 cursor-pointer gap-2 text-sm">
            <Fish className="h-4 w-4" />
            Achievements
          </DropdownMenuItem>
        </Link> */}
        {!userDB.data?.user?.twitter_handle ? (
          <DropdownMenuItem
            className="mx-1 my-1 cursor-pointer gap-2 text-sm"
            onClick={() => {
              window.location.href = `/api/auth/twitter?returnUrl=${encodeURIComponent(
                window.location.pathname,
              )}`;
            }}
          >
            <Twitter className="h-4 w-4" />
            Connect Twitter
          </DropdownMenuItem>
        ) : (
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Twitter className="h-4 w-4" />@{userDB.data.user.twitter_handle}
            </div>
            <button
              onClick={() => {
                disconnectTwitterMutation.mutate();
              }}
              className="text-xs text-white hover:text-gray-400"
            >
              Disconnect
            </button>
          </div>
        )}
        <div className="border-t border-border">
          <DropdownMenuItem
            className="mx-1 my-1 cursor-pointer gap-4 text-sm"
            onClick={logOutHandler}
          >
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;
