"use client";

import { Laptop2, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeButton({
  className = "",
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [theme, setThemee] = useState(resolvedTheme);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemee(localStorage.getItem("theme") ?? "");
  }, []);

  if (!mounted) {
    return (
      <Button
        variant={"ghost"}
        disabled={true}
        className="px-4 py-2 opacity-80 transition-all"
      >
        <Laptop2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "ghost",
          className: className,
        })}
      >
        {theme === "light" ? (
          <SunIcon className="h-4 w-4" />
        ) : theme === "dark" ? (
          <MoonIcon className="h-4 w-4" />
        ) : (
          <Laptop2 className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="cursor-pointer gap-4"
          onClick={() => {
            setTheme("light");
            setThemee("light");
          }}
        >
          <SunIcon className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-4"
          onClick={() => {
            setTheme("dark");
            setThemee("dark");
          }}
        >
          <MoonIcon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-4"
          onClick={() => {
            setTheme("system");
            setThemee("system");
          }}
        >
          <Laptop2 className="h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
