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
import Image from "next/image";
import { X } from "lucide-react";
import GenerationType from "@/app/generationtype";

const NavBar = ({
  initialSignedIn,
}: {
  initialSignedIn: boolean;
}) => {
  const { userId, isLoaded } = useAuth();
  const isSignedIn = isLoaded ? Boolean(userId) : initialSignedIn;

  const path = usePathname();

  const [isTop, setIsTop] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

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
      {showBanner && (
        <div className="ocean fixed left-0 right-0 top-0 z-30 text-white">
          <div className="text-md relative flex items-center justify-center px-10 py-2 text-center font-medium">
            <span>
              Use code{" "}
              <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-bold tracking-wide">
                CIAGUY
              </span>{" "}
              for a free $5 credit pack!
            </span>
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-3 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <header
        className={`border-sm fixed left-0 right-0 z-20 transition-all coarse:border-b coarse:bg-card/80 coarse:backdrop-blur-3xl ${
          showBanner ? "top-[36px]" : "top-0"
        } ${
          isTop
            ? ""
            : "fine:border-sm fine:border-b fine:bg-card/80 fine:backdrop-blur-3xl"
        } `}
      >
        <div className="flex items-center justify-between px-[5%] py-3">
          <div>
            <Link href={"/"}>
              <Image
                src={"/brainrot_new2.png"}
                width={40}
                height={40}
                alt="Brainrot.js logo"
                className="cursor-pointer opacity-90 transition-all hover:opacity-70"
              />
            </Link>
          </div>
          <div className="flex items-center justify-end gap-4">
            <div className="coarse:hidden">
              <ThemeButton />
            </div>

            <Link
              href={"/blog"}
              className={buttonVariants({ variant: "ghost" })}
            >
              Blog
            </Link>
            {isSignedIn ? (
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
      <GenerationType />
      {isSignedIn && path === "/" && <YourVideos />}
    </>
  );
};

export default NavBar;
