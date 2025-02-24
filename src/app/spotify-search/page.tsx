"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Search, FileText } from "lucide-react";

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  external_urls: { spotify: string };
  album: {
    images: { url: string; height: number; width: number }[];
  };
}

export default function SpotifySearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTrackId, setLoadingTrackId] = useState<string>("");
  const [loadingLyricsId, setLoadingLyricsId] = useState<string>("");
  const [lyricsData, setLyricsData] = useState<{
    lyrics: string;
    title: string;
    artist: string;
    trackId: string;
  } | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setError("");
      setTracks([]);

      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTracks(data.tracks?.items || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to search for tracks",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewMp3 = async (track: Track) => {
    try {
      setLoadingTrackId(track.id);
      setError("");

      console.log("Spotify URL:", track.external_urls.spotify);

      const response = await fetch("/api/spotify/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: track.external_urls.spotify }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("Media URLs response:", data.medias);

      // Redirect to the first media URL if available
      if (data.medias?.[0]?.url) {
        console.log("Selected media URL:", data.medias[0].url);
        window.open(data.medias[0].url, "_blank");
      } else {
        throw new Error("No media URL found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get media URL");
    } finally {
      setLoadingTrackId("");
    }
  };

  const handleViewLyrics = async (track: Track) => {
    try {
      setLoadingLyricsId(track.id);
      setError("");

      const response = await fetch("/api/spotify/lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: track.id,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setLyricsData({
        lyrics: data.lyrics,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        trackId: track.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lyrics");
    } finally {
      setLoadingLyricsId("");
    }
  };

  const handleCloseLyrics = (trackId: string) => {
    if (lyricsData?.trackId === trackId) {
      setLyricsData(null);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Spotify Track Downloader</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Search for a track</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter song name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery || isSearching}
              className="w-24"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Search Results:</p>
            <div className="space-y-2">
              {tracks.map((track) => (
                <div key={track.id}>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-4">
                      {track.album.images[0] && (
                        <img
                          src={track.album.images[0].url}
                          alt={`${track.name} album artwork`}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{track.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {track.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Button
                        onClick={() => handleViewMp3(track)}
                        disabled={loadingTrackId === track.id}
                        variant="outline"
                        size="sm"
                        className="mr-2"
                      >
                        {loadingTrackId === track.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        View MP3
                      </Button>
                      <Button
                        onClick={() => handleViewLyrics(track)}
                        disabled={loadingLyricsId === track.id}
                        variant="outline"
                        size="sm"
                      >
                        {loadingLyricsId === track.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        View Lyrics
                      </Button>
                    </div>
                  </div>
                  {lyricsData && lyricsData.trackId === track.id && (
                    <div className="mt-2 rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium">
                          {lyricsData.title} - {lyricsData.artist}
                        </h3>
                        <button
                          onClick={() => handleCloseLyrics(track.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Close lyrics"
                        >
                          ×
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm">
                        {lyricsData.lyrics}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
