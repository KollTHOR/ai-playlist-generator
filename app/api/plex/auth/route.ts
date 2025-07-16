import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
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

    // Create proper Plex auth URL
    const forwardUrl = encodeURIComponent(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/auth/success`
    );
    const authUrl = `https://app.plex.tv/auth#?clientID=ai-playlist-generator&code=${code}&context%5Bdevice%5D%5Bproduct%5D=AI%20Playlist%20Generator&context%5Bdevice%5D%5Bversion%5D=1.0&context%5Bdevice%5D%5Bplatform%5D=Web&context%5Bdevice%5D%5BplatformVersion%5D=1.0&context%5Bdevice%5D%5Bdevice%5D=Web%20Browser&context%5Bdevice%5D%5BdeviceName%5D=AI%20Playlist%20Generator&forwardUrl=${forwardUrl}`;

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
