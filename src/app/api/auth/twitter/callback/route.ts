import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { brainrotusers } from "@/server/db/schemas/users/schema";
import { eq } from "drizzle-orm";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  console.log("Received callback with code:", code);

  let state;
  try {
    const decodedState = Buffer.from(stateParam || "", "base64").toString();
    state = JSON.parse(decodedState);
    console.log("Decoded state:", state);
  } catch (error) {
    console.error("Failed to parse state:", error);
    state = { returnUrl: "/" };
  }

  const { returnUrl } = state;
  const { userId: clerkId } = auth();
  console.log("Clerk ID:", clerkId);

  if (!code || !clerkId) {
    console.error("Missing code or clerkId:", { code, clerkId });
    const redirectUrl = new URL(returnUrl, request.nextUrl.origin);
    redirectUrl.searchParams.append(
      "error",
      !code ? "No_code_provided" : "No_user_id",
    );
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange code for access token
    console.log("Exchanging code for access token...");
    const tokenResponse = await fetch(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code_verifier: "challenge",
        }),
      },
    ).then((res) => res.json());

    console.log("Token response:", tokenResponse);

    if (!tokenResponse.access_token) {
      throw new Error(
        "Failed to get access token: " + JSON.stringify(tokenResponse),
      );
    }

    console.log("Fetching Twitter user info...");
    const userInfo = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    }).then((res) => res.json());

    console.log("Twitter user info:", userInfo);

    if (!userInfo.data?.id || !userInfo.data?.username) {
      throw new Error("Invalid Twitter user info: " + JSON.stringify(userInfo));
    }

    // Check if Twitter account is already connected
    console.log("Checking for existing Twitter connection...");
    const existingUser = await db.query.brainrotusers.findFirst({
      where: eq(brainrotusers.twitter_id, userInfo.data.id),
    });

    console.log("Existing user check:", existingUser);

    if (existingUser && existingUser.clerk_id !== clerkId) {
      console.log("Twitter account already connected to different user");
      const redirectUrl = new URL(returnUrl, request.nextUrl.origin);
      redirectUrl.searchParams.append("error", "twitter_already_connected");
      redirectUrl.searchParams.append(
        "message",
        `Twitter account @${userInfo.data.username} is already connected to another account`,
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Update user with Twitter info
    console.log("Updating user with Twitter info...");
    try {
      const result = await db
        .update(brainrotusers)
        .set({
          twitter_handle: userInfo.data.username,
          twitter_id: userInfo.data.id,
        })
        .where(eq(brainrotusers.clerk_id, clerkId));

      console.log("Update result:", result);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }

    const redirectUrl = new URL(returnUrl, request.nextUrl.origin);
    redirectUrl.searchParams.append("twitter_connected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error during Twitter OAuth:", error);
    const redirectUrl = new URL(returnUrl, request.nextUrl.origin);
    redirectUrl.searchParams.append("error", "Twitter_auth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
