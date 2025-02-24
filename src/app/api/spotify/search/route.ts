import { NextRequest, NextResponse } from "next/server";

async function getSpotifyAccessToken() {
  const client_id = process.env.SPOTIFY_CLIENT_ID!;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET!;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query) {
      return NextResponse.json(
        { error: "No search query provided" },
        { status: 400 },
      );
    }

    const accessToken = await getSpotifyAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query,
      )}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search tracks" },
      { status: 500 },
    );
  }
}
