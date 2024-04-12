import React, { ReactNode } from "react";
import "../globals.css";
import { type Metadata } from "next";
import { GeistSans } from "geist/font";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  appleWebApp: true,
  manifest: "/manifest.json",
  icons: { apple: "/favicon.ico" },
  title: "brainrot.js",
  description: "Make learning fun again!",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
