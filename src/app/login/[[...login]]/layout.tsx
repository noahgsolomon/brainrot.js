import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Access Your Brainrot Videos",
  description:
    "Login to Brainrot.js to access your AI-generated videos, manage credits, and create new viral content with celebrity voices and memes.",
  openGraph: {
    title: "Login to Brainrot.js - AI Video Generator",
    description:
      "Access your brainrot videos and continue creating viral content with AI.",
    url: "https://brainrotjs.com/login",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Login to Brainrot.js - AI Video Generator",
    description:
      "Access your brainrot videos and continue creating viral content with AI.",
  },
  alternates: {
    canonical: "https://brainrotjs.com/login",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
