import "./globals.css";
import Providers from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/nav/navbar";
import { TRPCReactProvider } from "@/trpc/react";
import { type Metadata } from "next";
import ProgressBarProvider from "./progressbar";
import { Background } from "@/components/ui/background";
import { TooltipProvider } from "@/components/ui/tooltip";
import { gaegu } from "../lib/fonts";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Footer } from "./Footer";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  metadataBase: new URL("https://brainrotjs.com"),
  title: {
    default:
      "Brainrot.js - AI Brainrot Video Generator & Maker | Create Viral Content",
    template: "%s | Brainrot.js",
  },
  description:
    "The #1 AI-powered brainrot maker and video generator. Create hilarious brainrot videos with celebrity voices, AI dialogue, and viral memes. Free brainrot creator with instant generation.",
  keywords: [
    "brainrot maker",
    "brainrot ai",
    "brainrot video generator",
    "brainrot website",
    "brainrot creator",
    "ai rap songs",
    "ai song generator",
    "ai video generator",
    "celebrity voice generator",
    "meme video maker",
    "viral content creator",
    "tiktok video generator",
    "italian brainrot",
    "brainrot.js",
    "brainrotjs",
  ],
  authors: [{ name: "Noah Solomon", url: "https://twitter.com/noahgsolomon" }],
  creator: "Noah Solomon",
  publisher: "Brainrot.js",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://brainrotjs.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brainrotjs.com",
    siteName: "Brainrot.js",
    title: "Brainrot.js - AI Brainrot Video Generator & Maker",
    description:
      "Create viral brainrot videos instantly with AI. Generate funny celebrity dialogues, memes, and more. The ultimate brainrot maker for content creators.",
    images: [
      {
        url: "/brainrot_new2.png",
        width: 1200,
        height: 630,
        alt: "Brainrot.js - AI Video Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brainrot.js - AI Brainrot Video Generator & Maker",
    description:
      "Create viral brainrot videos instantly with AI. Generate funny celebrity dialogues, memes, and more.",
    site: "@brainrotjs",
    creator: "@noahgsolomon",
    images: ["/brainrot_new2.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brainrot.js",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  category: "technology",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const bannerDismissed = cookieStore.get("banner_dismissed")?.value === "1";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${gaegu.variable} antialiased`}>
        <TRPCReactProvider>
          <ClerkProvider>
            <TooltipProvider delayDuration={50}>
              <Providers>
                <ProgressBarProvider>
                  <NavBar initialSignedIn={Boolean(userId)} initialBannerDismissed={bannerDismissed} />
                  <Background />
                  {children}
                  <Footer />
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
