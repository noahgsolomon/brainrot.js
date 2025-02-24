import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    const response = await fetch(
      "https://zylalabs.com/api/4117/spotify+track+download+api/4970/download",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MUSIC_DOWNLOAD_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      },
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download track" },
      { status: 500 },
    );
  }
}
