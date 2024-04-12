import "../globals.css";
import NavBar from "@/components/nav/navbar";
import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { type Metadata } from "next";
import { GeistSans } from "geist/font";
import { Analytics } from "@vercel/analytics/react";

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
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`}>
        <TRPCReactProvider headers={headers()}>{children}</TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
