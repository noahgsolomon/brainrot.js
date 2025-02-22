import { NextRequest, NextResponse } from "next/server";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

export async function GET(request: NextRequest) {
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  const returnUrl = request.nextUrl.searchParams.get("returnUrl") || "/";

  // Base64 encode the state to preserve special chars
  const state = Buffer.from(
    JSON.stringify({
      returnUrl: returnUrl,
    }),
  ).toString("base64");

  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", TWITTER_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", TWITTER_REDIRECT_URI);
  authUrl.searchParams.append("scope", "tweet.read users.read offline.access");
  authUrl.searchParams.append("code_challenge", "challenge");
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge_method", "plain");

  return NextResponse.redirect(authUrl.toString());
}
