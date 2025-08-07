import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Start Creating Brainrot Videos",
  description:
    "Join Brainrot.js and start creating viral AI-generated videos. Get free credits to make brainrot content with celebrity voices, memes, and hilarious dialogues.",
  openGraph: {
    title: "Sign Up for Brainrot.js - AI Video Generator",
    description:
      "Join thousands creating viral brainrot videos with AI. Get started with free credits.",
    url: "https://brainrotjs.com/signup",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up for Brainrot.js - AI Video Generator",
    description:
      "Join thousands creating viral brainrot videos with AI. Get started with free credits.",
  },
  alternates: {
    canonical: "https://brainrotjs.com/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
