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
    <Button
      className="flex flex-row items-center gap-2"
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
  );
}
