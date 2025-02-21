import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "transition-all inline-flex items-center justify-center rounded-lg text-sm font-medium cursor-pointer outline-none disabled:pointer-events-none disabled:opacity-50 ",
  {
    variants: {
      variant: {
        none: "",
        brain:
          " hover:scale-[101%] active:scale-[99%] transition-all border border-primary/20 brain text-secondary dark:text-primary hover:opacity-[80%] hover:text-brain",

        default:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-primary text-primary-foreground hover:bg-primary/90",
        darkMode:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-secondary dark:bg-primary text-secondary-foreground dark:text-primary-foreground hover:bg-secondary/90 dark:hover:bg-primary/90",
        lightMode:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-primary dark:bg-secondary text-primary-foreground dark:text-secondary-foreground hover:bg-primary/90 dark:hover:bg-secondary/90",
        destructive:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          " hover:scale-[101%] active:scale-[99%] transition-all border border-primary/20 bg-card/50 hover:bg-accent hover:text-accent-foreground",
        gold: " hover:scale-[101%] active:scale-[99%] transition-all border border-primary/20 gold text-secondary dark:text-primary hover:opacity-[80%] hover:text-gold",
        red: "hover:scale-[101%] active:scale-[99%] transition-all border border-red-500/20 red bg-red-500 text-secondary dark:text-primary hover:opacity-[80%]",
        secondary:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-accent text-secondary-foreground hover:bg-primary/10 dark:hover:bg-accent/80",
        ghost:
          "hover:scale-[101%] active:scale-[99%] transition-all hover:bg-accent hover:text-accent-foreground",
        link: "hover:scale-[101%] active:scale-[99%] transition-all text-primary underline-offset-4 hover:underline",
        darkModeLink:
          "hover:scale-[100%] active:scale-[100%] transition-all text-secondary dark:text-primary underline-offset-4 hover:underline",
        lightModeLink:
          "hover:scale-[100%] active:scale-[100%] transition-all text-primary dark:text-secondary underline-offset-4 hover:underline",
        success:
          "shadow-sm hover:scale-[101%] active:scale-[99%] transition-all bg-success text-primary hover:bg-success/90",
        rainbow: `text-secondary dark:text-primary bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 via-green-500 to-blue-500 via-indigo-500 to-purple-500 background-animate shadow-sm hover:scale-[101%] active:scale-[99%] transition-all `,
        pink: "border bg-pink-500/50 border-pink-500 hover:bg-pink-500/40 hover:scale-[101%] active:scale-[99%] transition-all",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        xs: "h-5 px-2 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
        xl: "text-lg h-12 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
