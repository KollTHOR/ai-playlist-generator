import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PlaylistRequest } from "@/types";

export async function POST(request: NextRequest) {
  const { PLEX_SERVER_URL } = process.env;

  if (!PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    const body: PlaylistRequest & { userToken: string } = await request.json();
    const { title, trackIds, userToken } = body;

    if (!userToken) {
      return NextResponse.json(
        { error: "Missing user token" },
        { status: 401 }
      );
    }

    // Step 1: Get the server machine identifier (required for track URIs)
    const identityResponse = await axios.get(`${PLEX_SERVER_URL}/identity`, {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": userToken,
      },
      timeout: 10000,
    });

    const machineIdentifier =
      identityResponse.data?.myPlexConnection?.machineIdentifier;
    if (!machineIdentifier) {
      return NextResponse.json(
        { error: "Failed to get Plex server machine identifier" },
        { status: 500 }
      );
    }

    // Step 2: Create the playlist
    const createResponse = await axios.post(
      `${PLEX_SERVER_URL}/playlists`,
      null,
      {
        params: {
          type: "audio",
          title,
        },
        headers: {
          Accept: "application/json",
          "X-Plex-Token": userToken,
        },
        timeout: 10000,
      }
    );

    const playlistMetadata = createResponse.data?.MediaContainer?.Metadata;
    if (!playlistMetadata || playlistMetadata.length === 0) {
      return NextResponse.json(
        { error: "Failed to create playlist: no metadata returned" },
        { status: 500 }
      );
    }

    const playlistId = playlistMetadata[0].ratingKey;

    // Step 3: Build URIs for tracks correctly
    const trackUris = trackIds
      .map((id) => `library://${machineIdentifier}/item/${id}`)
      .join(",");

    // Step 4: Add tracks to the created playlist
    await axios.put(`${PLEX_SERVER_URL}/playlists/${playlistId}/items`, null, {
      params: {
        uri: trackUris,
      },
      headers: {
        "X-Plex-Token": userToken,
        Accept: "application/json",
      },
      timeout: 10000,
    });

    return NextResponse.json({ success: true, playlistId });
  } catch (error) {
    console.error("Playlist creation error:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
