import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    // Step 1: Request a PIN from Plex
    const pinResponse = await axios.post(
      "https://plex.tv/api/v2/pins",
      {
        strong: true,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Plex-Product": "AI Playlist Generator",
          "X-Plex-Version": "1.0",
          "X-Plex-Client-Identifier": "ai-playlist-generator",
          "X-Plex-Platform": "Web",
          "X-Plex-Platform-Version": "1.0",
          "X-Plex-Device": "Web Browser",
          "X-Plex-Device-Name": "AI Playlist Generator",
        },
      }
    );

    const { id, code } = pinResponse.data;

    // Step 2: Create the proper OAuth URL
    const authUrl = `https://app.plex.tv/auth#!?clientID=ai-playlist-generator&code=${code}&context[device][product]=AI%20Playlist%20Generator&context[device][version]=1.0&context[device][platform]=Web&context[device][platformVersion]=1.0&context[device][device]=Web%20Browser&context[device][deviceName]=AI%20Playlist%20Generator&context[device][model]=Web&forwardUrl=${encodeURIComponent(
      "http://localhost:3000/api/plex/callback"
    )}`;

    return NextResponse.json({
      authUrl,
      pinId: id,
      code,
    });
  } catch (error) {
    console.error("Plex auth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication" },
      { status: 500 }
    );
  }
}
