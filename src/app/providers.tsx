"use client";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
//@ts-ignore
import LagRadar from "react-lag-radar";

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  return (
    <ThemeProvider attribute="class">
      <div className="fixed bottom-4 left-4 z-20 rounded-full border bg-primary/20">
        {process.env.NEXT_PUBLIC_ENV === "LOCAL" && <LagRadar />}
      </div>
      {children}
      <Toaster
        richColors
        position="top-center"
        visibleToasts={1}
        duration={2000}
      />
    </ThemeProvider>
  );
};

export default Providers;
