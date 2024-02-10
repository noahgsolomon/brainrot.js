import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border bg-secondary/90 px-3 py-1 text-sm shadow-none  outline-none transition-all placeholder:text-muted-foreground focus:outline-1 focus:outline-lightBlue disabled:cursor-not-allowed disabled:opacity-50",
        className,
        "coarse:text-base",
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
