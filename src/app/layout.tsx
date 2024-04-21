import "./globals.css";
import Providers from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/nav/navbar";
import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { type Metadata } from "next";
import ProgressBarProvider from "./progressbar";
import { GeistSans } from "geist/font";
import { Background } from "@/components/ui/background";
import { Analytics } from "@vercel/analytics/react";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  appleWebApp: true,
  manifest: "/manifest.json",
  icons: { apple: "/favicon.ico" },
  openGraph: {
    url: "https://brainrotjs.com",
    title: "brainrotjs.com",
    description: "Make learning fun again!",
    images: ["https://images.smart.wtf/brainrot.png"],
  },
  title: "brainrot.js",
  description: "Make learning fun again!",
  twitter: {
    card: "summary_large_image",
    site: "brainrotjs.com",
    creator: "@noahgsolomon",
    images: ["https://images.smart.wtf/brainrot.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`}>
        <TRPCReactProvider headers={headers()}>
          <ClerkProvider>
            <TooltipProvider delayDuration={50}>
              <Providers>
                <ProgressBarProvider>
                  <NavBar />
                  <Background />
                  {children}
                </ProgressBarProvider>
              </Providers>
            </TooltipProvider>
          </ClerkProvider>
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
