import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PlexTrack } from "@/types";

export async function GET(request: NextRequest) {
  const { PLEX_TOKEN, PLEX_SERVER_URL } = process.env;

  if (!PLEX_TOKEN || !PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex configuration" },
      { status: 500 }
    );
  }

  try {
    const response = await axios.get(
      `${PLEX_SERVER_URL}/status/sessions/history/all?X-Plex-Token=${PLEX_TOKEN}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    // Filter for audio/music items only
    const musicHistory: PlexTrack[] =
      response.data.MediaContainer.Metadata?.filter(
        (item: PlexTrack) => item.type === "track"
      ) || [];

    return NextResponse.json(musicHistory);
  } catch (error) {
    console.error("Plex history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Plex history" },
      { status: 500 }
    );
  }
}
