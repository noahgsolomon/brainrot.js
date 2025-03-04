import "./globals.css";
import Providers from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/nav/navbar";
import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { type Metadata } from "next";
import ProgressBarProvider from "./progressbar";
import { Background } from "@/components/ui/background";
import { TooltipProvider } from "@/components/ui/tooltip";
import { gaegu } from "../lib/fonts";
import { AudioPlayer } from "@/components/AudioPlayer";

export const metadata: Metadata = {
  appleWebApp: true,
  manifest: "/manifest.json",
  icons: { apple: "/favicon.ico" },
  openGraph: {
    url: "https://brainrotjs.com",
    title: "brainrotjs.com",
    description: "Generate funny videos of celebrities today!",
    images: ["/brainrot_new2.png"],
  },
  title: "brainrot.js",
  description: "Generate funny videos of celebrities today!",
  twitter: {
    card: "summary_large_image",
    site: "brainrotjs.com",
    creator: "@noahgsolomon",
    images: ["/brainrot_new2.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gaegu.variable} antialiased`}>
        <TRPCReactProvider headers={headers()}>
          <ClerkProvider>
            <TooltipProvider delayDuration={50}>
              <Providers>
                <ProgressBarProvider>
                  <NavBar />
                  <Background />
                  {children}
                  <AudioPlayer />
                </ProgressBarProvider>
              </Providers>
            </TooltipProvider>
          </ClerkProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
