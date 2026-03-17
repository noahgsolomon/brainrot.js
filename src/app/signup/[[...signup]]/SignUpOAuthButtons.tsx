import { Button } from "@/components/ui/button";
import { useSignUp } from "@clerk/nextjs/legacy";
import { type OAuthStrategy } from "@clerk/shared/types";
import { Github } from "lucide-react";

export default function SignUpOAuthButtons({
  searchParams,
}: {
  searchParams: {
    // all for create video
    agent1Id?: string;
    agent2Id?: string;
    agent1Name?: string;
    agent2Name?: string;
    title?: string;
    credits?: string;
    music?: string;
    background?: string;
    assetType?: string;
    duration?: string;
    fps?: string;
  };
}) {
  const { signUp } = useSignUp();

  const searchQueryString = `?agent1Id=${encodeURIComponent(
    searchParams.agent1Id || "",
  )}&agent2Id=${encodeURIComponent(
    searchParams.agent2Id || "",
  )}&agent1Name=${encodeURIComponent(
    searchParams.agent1Name || "",
  )}&agent2Name=${encodeURIComponent(
    searchParams.agent2Name || "",
  )}&title=${encodeURIComponent(
    searchParams.title || "",
  )}&credits=${encodeURIComponent(
    searchParams.credits || "",
  )}&music=${encodeURIComponent(
    searchParams.music || "",
  )}&background=${encodeURIComponent(
    searchParams.background || "",
  )}&assetType=${encodeURIComponent(
    searchParams.assetType || "",
  )}&duration=${encodeURIComponent(
    searchParams.duration || "",
  )}&fps=${encodeURIComponent(searchParams.fps || "")}`;

  const signInWith = (strategy: OAuthStrategy) => {
    return signUp?.authenticateWithRedirect({
      strategy,
      redirectUrl: `/auth${searchQueryString}`,
      redirectUrlComplete: `/auth${searchQueryString}`,
    });
  };

  // Render a button for each supported OAuth provider
  // you want to add to your app
  return (
    <>
      <Button
        className="flex flex-row items-center gap-2  border-[#779eeb] bg-[#99b3e6] text-secondary hover:bg-[#99b3e6]/80 hover:text-secondary dark:border-[#b5c5e4] dark:text-primary hover:dark:text-primary"
        variant={"outline"}
        onClick={() => signInWith("oauth_google")}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </Button>
      <Button
        className="flex flex-row items-center gap-2 bg-[#333] text-secondary hover:bg-[#333]/80 hover:text-secondary dark:text-primary hover:dark:text-primary"
        variant={"outline"}
        onClick={() => signInWith("oauth_github")}
      >
        <Github className="h-5 w-5" />
        Sign up with GitHub
      </Button>
    </>
  );
}
