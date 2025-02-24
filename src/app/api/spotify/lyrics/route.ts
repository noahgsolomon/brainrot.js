import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;
let tokenExpiration: number = 0;

async function getSpotifyToken() {
  if (accessToken && tokenExpiration > Date.now()) {
    return accessToken;
  }

  console.log("Getting new Spotify token...");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Token error:", data);
    throw new Error(`Failed to get token: ${data.error}`);
  }

  console.log("Got new token, expires in:", data.expires_in);
  accessToken = data.access_token;
  tokenExpiration = Date.now() + data.expires_in * 1000;
  return accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: trackId } = body;

    const token = await getSpotifyToken();
    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (!trackResponse.ok) {
      return NextResponse.json({
        error: `Failed to fetch track details: ${trackResponse.status}`,
      });
    }

    const trackData = await trackResponse.json();

    // Query LRCLIB API
    const params = new URLSearchParams({
      track_name: trackData.name,
      artist_name: trackData.artists[0].name,
      album_name: trackData.album.name,
    });

    const lyricsResponse = await fetch(
      `https://lrclib.net/api/get?${params.toString()}`,
      {
        headers: {
          "Lrclib-Client": "SpotifyLyricsApp v1.0",
        },
      },
    );

    if (!lyricsResponse.ok) {
      const searchParams = new URLSearchParams({
        track_name: trackData.name,
        artist_name: trackData.artists[0].name,
      });

      const searchResponse = await fetch(
        `https://lrclib.net/api/search?${searchParams.toString()}`,
        {
          headers: {
            "Lrclib-Client": "SpotifyLyricsApp v1.0",
          },
        },
      );

      if (!searchResponse.ok) {
        return NextResponse.json({ error: "No lyrics found" });
      }

      const searchResults = await searchResponse.json();
      if (!searchResults.length) {
        return NextResponse.json({ error: "No lyrics found" });
      }

      return NextResponse.json({
        lyrics: searchResults[0].plainLyrics,
        syncType: searchResults[0].syncedLyrics ? "LINE_SYNCED" : "UNSYNCED",
        lines: searchResults[0].syncedLyrics
          ? parseSyncedLyrics(searchResults[0].syncedLyrics)
          : searchResults[0].plainLyrics
              .split("\n")
              .map((words: string) => ({ words })),
      });
    }

    const lyricsData = await lyricsResponse.json();

    return NextResponse.json({
      lyrics: lyricsData.plainLyrics,
      syncType: lyricsData.syncedLyrics ? "LINE_SYNCED" : "UNSYNCED",
      lines: lyricsData.syncedLyrics
        ? parseSyncedLyrics(lyricsData.syncedLyrics)
        : lyricsData.plainLyrics.split("\n").map((words: string) => ({
            words,
          })),
    });
  } catch (error) {
    console.error("Lyrics fetch error:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch lyrics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 },
    );
  }
}

function parseSyncedLyrics(syncedLyrics: string) {
  return syncedLyrics
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const match = line.match(/\[(\d{2}:\d{2}\.\d{2})\](.*)/);
      if (!match) return { words: line.trim() };
      const [, timeStr, words] = match;
      const [mins, secs] = timeStr?.split(":") ?? [];
      const startTimeMs =
        (parseInt(mins ?? "0") * 60 + parseFloat(secs ?? "0")) * 1000;
      return {
        words: words?.trim() ?? "",
        startTimeMs,
      };
    });
}
