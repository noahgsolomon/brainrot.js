"use client";

import ThemeButton from "./theme";
import { buttonVariants } from "../ui/button";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import UserButton from "./UserButton";
import { useEffect, useState } from "react";
import CreateVideo from "@/app/createvideo";
import YourVideos from "@/app/yourvideos";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const NavBar = () => {
  const { userId } = useAuth();

  const path = usePathname();

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
        <div className=" flex w-full items-center justify-center border-b bg-secondary">
          <Link
            className={buttonVariants({
              variant: "link",
              className: " font-bold underline",
            })}
            target="_blank"
            href={"https://twitter.com/brainrotjs"}
          >
            💥 JOIN THE MOVEMENT 🧠
          </Link>
        </div>
        <div className="flex items-center justify-between px-[5%] py-1">
          <div>
            <Link href={"/"}>
              <Image
                src={"/brain.gif"}
                width={64}
                height={64}
                alt="brain"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-14 w-14 cursor-pointer p-0 text-4xl opacity-80 transition-all hover:opacity-70",
                )}
              />
            </Link>
          </div>
          <div className="flex items-center justify-end gap-4">
            <div className="coarse:hidden">
              <ThemeButton />
            </div>

            {userId ? (
              <>
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
