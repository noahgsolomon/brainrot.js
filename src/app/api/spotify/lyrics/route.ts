import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, artists } = body;

    const searchResponse = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(
        `${name} ${artists[0].name}`,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
        },
      },
    );

    const searchData = await searchResponse.json();

    if (!searchData.response.hits.length) {
      return NextResponse.json({ error: "No lyrics found" });
    }

    const songHit = searchData.response.hits.find((hit: any) => {
      const result = hit.result;
      return (
        result.title.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(result.title.toLowerCase())
      );
    });

    if (!songHit) {
      return NextResponse.json({ error: "No matching song lyrics found" });
    }

    const hit = songHit.result;

    const lyricsResponse = await fetch(hit.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://genius.com/",
      },
    });
    const html = await lyricsResponse.text();
    console.log("Response status:", lyricsResponse.status);
    console.log("HTML snippet:", html.substring(0, 1000));

    let lyricsMatch = html.match(
      /<div[^>]*(?:class="Lyrics__Container-sc-[^"]*"|data-lyrics-container="true")[^>]*>([\s\S]*?)<\/div>/g,
    );

    if (!lyricsMatch) {
      lyricsMatch =
        html.match(/<div[^>]*class="lyrics"[^>]*>([\s\S]*?)<\/div>/g) ||
        html.match(/class="Lyrics__Root-sc[^>]*>([\s\S]*?)<\/div>/g) ||
        html.match(
          /<div[^>]*(?:class="SongPageGrid-sc[^"]*")[^>]*>([\s\S]*?)<\/div>/g,
        );
    }

    if (!lyricsMatch) {
      return NextResponse.json({
        lyrics: `Unable to extract lyrics automatically.\nView lyrics at: ${hit.url}`,
        title: hit.title,
        artist: hit.primary_artist.name,
        url: hit.url,
      });
    }

    const lyrics = lyricsMatch
      .join("\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/data-lyrics-container="true" class="Lyrics-sc-[^"]*">/g, "")
      .replace(/\[Produced by[^\n]*\]/g, "")
      .trim();

    return NextResponse.json({
      lyrics,
      title: hit.title,
      artist: hit.primary_artist.name,
      url: hit.url,
    });
  } catch (error) {
    console.error("Lyrics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lyrics" },
      { status: 500 },
    );
  }
}
