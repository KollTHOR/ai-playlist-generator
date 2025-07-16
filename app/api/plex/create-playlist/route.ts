import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PlaylistRequest } from "@/types";

export async function POST(request: NextRequest) {
  const { PLEX_TOKEN, PLEX_SERVER_URL } = process.env;

  if (!PLEX_TOKEN || !PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex configuration" },
      { status: 500 }
    );
  }

  try {
    const body: PlaylistRequest = await request.json();
    const { title, trackIds } = body;

    // Create playlist
    const createResponse = await axios.post(
      `${PLEX_SERVER_URL}/playlists?type=audio&title=${encodeURIComponent(
        title
      )}&X-Plex-Token=${PLEX_TOKEN}`,
      {},
      { headers: { Accept: "application/json" } }
    );

    const playlistMetadata = createResponse.data?.MediaContainer?.Metadata;
    if (!playlistMetadata || playlistMetadata.length === 0) {
      return NextResponse.json(
        { error: "Failed to create playlist: no metadata returned" },
        { status: 500 }
      );
    }

    const playlistId = playlistMetadata[0].ratingKey;

    // Add tracks to playlist
    const trackUris = trackIds
      .map((id) => `server://${PLEX_SERVER_URL}/library/metadata/${id}`)
      .join(",");

    await axios.put(
      `${PLEX_SERVER_URL}/playlists/${playlistId}/items?uri=${encodeURIComponent(
        trackUris
      )}&X-Plex-Token=${PLEX_TOKEN}`
    );

    return NextResponse.json({ success: true, playlistId });
  } catch (error) {
    console.error("Playlist creation error:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
