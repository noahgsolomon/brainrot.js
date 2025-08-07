import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch Your Brainrot Videos",
  description:
    "Watch and download your AI-generated brainrot videos. Share viral content with celebrity voices, memes, and funny dialogues created with Brainrot.js.",
  openGraph: {
    title: "Watch Your Brainrot Videos | Brainrot.js",
    description:
      "Watch and download your AI-generated brainrot videos. Share viral content with celebrity voices and memes.",
    url: "https://brainrotjs.com/watch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watch Your Brainrot Videos | Brainrot.js",
    description:
      "Watch and download your AI-generated brainrot videos. Share viral content with celebrity voices and memes.",
  },
  alternates: {
    canonical: "https://brainrotjs.com/watch",
  },
};

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
