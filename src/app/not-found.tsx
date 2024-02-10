"use client";

import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const Error = () => {
  return (
    <div className="flex h-[calc(100vh-20rem)] flex-col items-center justify-center gap-8">
      404 Not Found Error
      <Link className={buttonVariants()} href="/">
        Home
      </Link>
    </div>
  );
};

export default Error;
