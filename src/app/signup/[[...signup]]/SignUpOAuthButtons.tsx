import { Button } from "@/components/ui/button";
import { useSignUp } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import Image from "next/image";

export default function SignUpOAuthButtons() {
  const { signUp } = useSignUp();

  const signInWith = (strategy: OAuthStrategy) => {
    return signUp?.authenticateWithRedirect({
      strategy,
      redirectUrl: "/auth",
      redirectUrlComplete: "/auth",
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
        <Image
          alt="google"
          width={20}
          height={20}
          src={"https://images.smart.wtf/googleicon.webp"}
        />
        Sign up with Google
      </Button>
      <Button
        className="flex flex-row items-center gap-2 bg-[#333] text-secondary hover:bg-[#333]/80 hover:text-secondary dark:text-primary hover:dark:text-primary"
        variant={"outline"}
        onClick={() => signInWith("oauth_github")}
      >
        <Image
          alt="github"
          width={45}
          height={45}
          src={"https://images.smart.wtf/github.png"}
        />
        Sign up with GitHub
      </Button>
    </>
  );
}
