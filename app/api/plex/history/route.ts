/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  const { PLEX_SERVER_URL } = process.env;

  try {
    const { userToken, userId } = await request.json();

    if (!userToken || !userId) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 }
      );
    }

    const response = await axios.get(
      `${PLEX_SERVER_URL}/status/sessions/history/${userId}?X-Plex-Token=${userToken}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    const userMusicHistory =
      response.data.MediaContainer.Metadata?.filter(
        (item: any) => item.type === "track"
      ) || [];

    return NextResponse.json(userMusicHistory);
  } catch (error) {
    console.error("User history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user history" },
      { status: 500 }
    );
  }
}
