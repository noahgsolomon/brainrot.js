"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";
import { CircleDot } from "lucide-react";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

type RadioGroupItemProps = React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> & {
  correct?: boolean;
  incorrect?: boolean;
};

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, correct, incorrect, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border border-border text-primary outline-none transition-all hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        `${
          correct
            ? "bg-success hover:bg-success/60"
            : incorrect
            ? "bg-destructive hover:bg-destructive/60"
            : ""
        }`,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="ring-none flex items-center justify-center">
        {!correct && !incorrect && (
          <CircleDot className="h-3.5 w-3.5 fill-primary" />
        )}
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
