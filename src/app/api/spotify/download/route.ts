import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 },
      );
    }

    // Zylalabs API expects GET with songId parameter
    const response = await fetch(
      `https://zylalabs.com/api/4117/spotify+track+download+api/4970/download?songId=${encodeURIComponent(
        url,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MUSIC_DOWNLOAD_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "Failed to download track" },
      { status: 500 },
    );
  }
}

// Keep POST for backward compatibility if needed
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Zylalabs API expects GET with songId parameter
    const response = await fetch(
      `https://zylalabs.com/api/4117/spotify+track+download+api/4970/download?songId=${encodeURIComponent(
        url,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MUSIC_DOWNLOAD_KEY}`,
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "Failed to download track" },
      { status: 500 },
    );
  }
}
