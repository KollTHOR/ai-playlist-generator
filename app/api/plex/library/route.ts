/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Change from GET to POST to match your client request
export async function POST(request: NextRequest) {
  const { PLEX_SERVER_URL } = process.env;

  if (!PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    const { userToken } = await request.json();

    if (!userToken) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 }
      );
    }

    // Get user's library data
    const response = await axios.get(
      `${PLEX_SERVER_URL}/library/sections?X-Plex-Token=${userToken}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    const musicLibraries =
      response.data.MediaContainer.Directory?.filter(
        (lib: any) => lib.type === "artist"
      ) || [];

    // Get tracks from all music libraries
    const allTracks = [];
    for (const library of musicLibraries) {
      try {
        const tracksResponse = await axios.get(
          `${PLEX_SERVER_URL}/library/sections/${library.key}/all?type=10&X-Plex-Token=${userToken}`,
          {
            headers: { Accept: "application/json" },
          }
        );

        if (tracksResponse.data.MediaContainer.Metadata) {
          allTracks.push(...tracksResponse.data.MediaContainer.Metadata);
        }
      } catch (error) {
        console.error(
          `Error fetching tracks from library ${library.key}:`,
          error
        );
      }
    }

    return NextResponse.json({
      tracks: allTracks,
      totalLibraryCount: allTracks.length,
    });
  } catch (error) {
    console.error("Library API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch library data" },
      { status: 500 }
    );
  }
}
