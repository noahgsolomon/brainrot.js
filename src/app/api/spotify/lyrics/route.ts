import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, artists } = body;

    const searchResponse = await axios.get(
      `https://api.genius.com/search?q=${encodeURIComponent(
        `${name} ${artists[0].name}`,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}`,
        },
      },
    );

    const searchData = searchResponse.data;

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

    const response = await axios.get(hit.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 5000,
    });

    const html = response.data;

    // Load HTML into Cheerio
    const $ = cheerio.load(html);

    // Try different selectors that Genius might use for lyrics
    let lyricsElements = $('div[data-lyrics-container="true"]');
    if (!lyricsElements.length) {
      lyricsElements = $(".lyrics");
    }
    if (!lyricsElements.length) {
      lyricsElements = $(".Lyrics__Root-sc");
    }
    if (!lyricsElements.length) {
      lyricsElements = $(".SongPageGrid-sc");
    }

    if (!lyricsElements.length) {
      return NextResponse.json({
        lyrics: `Unable to extract lyrics automatically.\nView lyrics at: ${hit.url}`,
        title: hit.title,
        artist: hit.primary_artist.name,
        url: hit.url,
      });
    }

    // Extract and clean lyrics
    const lyrics = lyricsElements
      .map((_, element) => $(element).text())
      .get()
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\[Produced by[^\n]*\]/g, "")

      // Add proper spacing
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\]([A-Z])/g, "] $1")
      .replace(/\)([A-Z])/g, ") $1")
      .replace(/\'([A-Z])/g, "' $1")
      .replace(/([a-z])\'([A-Z])/g, "$1' $2")

      // Section formatting
      .replace(/\[([^\]]+)\]/g, "\n[$1]\n")
      .replace(/\n([A-Z][a-z]+:)/g, "\n\n$1")
      .replace(/([.?!])\s*([A-Z])/g, "$1\n$2")

      // Clean up extra whitespace
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
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
