import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { LastFmTrack } from "@/types";

export async function GET(request: NextRequest) {
  const { LASTFM_API_KEY } = process.env;

  if (!LASTFM_API_KEY) {
    return NextResponse.json(
      { error: "Missing Last.fm API key" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre");
  const limit = searchParams.get("limit") || "50";

  try {
    let url = `http://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;

    if (genre) {
      url = `http://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${genre}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    }

    const response = await axios.get(url);
    const tracks: LastFmTrack[] = response.data.tracks?.track || [];

    return NextResponse.json(tracks);
  } catch (error) {
    console.error("Last.fm error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Last.fm data" },
      { status: 500 }
    );
  }
}
