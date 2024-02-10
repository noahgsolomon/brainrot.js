"use client";

import ThemeButton from "./theme";
import { Button, buttonVariants } from "../ui/button";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import UserButton from "./UserButton";
import { useEffect, useState } from "react";
import CreateVideo from "@/app/createvideo";
import YourVideos from "@/app/yourvideos";

const NavBar = () => {
  const { userId } = useAuth();

  const path = usePathname();

  // let user;
  // let daysSinceAccountCreation = 0;
  // trial length
  // const trialLength = 7;
  // const userQuery = trpc.user.user.useQuery();

  // if (userId) {
  // user = userQuery.data;

  // const createdAt = user?.user?.created_at;

  // if (createdAt) {
  //   const accountCreationDate = new Date(createdAt).getTime();
  //   const currentDate = new Date().getTime();

  //   const timeDifference = currentDate - accountCreationDate;
  //   daysSinceAccountCreation = Math.floor(
  //     timeDifference / (1000 * 60 * 60 * 24),
  //   );
  // const accountCreationDate = new Date(createdAt).getTime();
  // const currentDate = new Date().getTime();

  // const timeDifference = currentDate - accountCreationDate;
  // daysSinceAccountCreation = Math.floor(
  //   timeDifference / (1000 * 60 * 60 * 24),
  // );
  // }
  // }

  const [isTop, setIsTop] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      setIsTop(window.scrollY <= 35);
    };

    window.addEventListener("scroll", checkScroll);
    return () => {
      window.removeEventListener("scroll", checkScroll);
    };
  }, []);

  return (
    <>
      <header
        className={`border-sm fixed left-0 right-0 top-0 z-20 transition-all coarse:border-b coarse:bg-card/80 coarse:backdrop-blur-3xl ${
          isTop
            ? ""
            : "fine:border-sm fine:border-b fine:bg-card/80 fine:backdrop-blur-3xl"
        } `}
      >
        <div className="flex items-center justify-between px-[5%] py-1">
          <div>
            <Link href={"/"}>
              <p
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-14 w-14 cursor-pointer p-0 text-4xl opacity-80 transition-all hover:opacity-70",
                )}
              >
                🧠
              </p>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-4">
            <div className="coarse:hidden">
              <ThemeButton />
            </div>

            {userId ? (
              <>
                {/* {user?.user && !user?.user?.subscribed && (
                    <Link
                      href={"/pricing"}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      UPGRADE
                    </Link>
                  )} */}
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href={"signup"}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Sign up
                </Link>
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href={"login"}
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <CreateVideo />
      {userId && path === "/" && <YourVideos />}
    </>
  );
};

export default NavBar;
