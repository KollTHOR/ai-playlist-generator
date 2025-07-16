import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get("path");
  const userToken = searchParams.get("token");

  if (!imagePath) {
    return NextResponse.json({ error: "Missing image path" }, { status: 400 });
  }

  if (!userToken) {
    return NextResponse.json({ error: "Missing user token" }, { status: 400 });
  }

  // Get server URL from environment
  const { PLEX_SERVER_URL } = process.env;
  if (!PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    console.log("Fetching image:", `${PLEX_SERVER_URL}${imagePath}`);

    const response = await axios.get(
      `${PLEX_SERVER_URL}${imagePath}?X-Plex-Token=${userToken}`,
      {
        responseType: "arraybuffer",
        headers: {
          Accept: "image/*",
          "User-Agent": "Plex/1.0",
        },
        timeout: 10000,
      }
    );

    if (response.status !== 200) {
      throw new Error(`Image request failed with status ${response.status}`);
    }

    const contentType = response.headers["content-type"] || "image/jpeg";
    const buffer = Buffer.from(response.data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    // Return SVG placeholder on error
    const placeholderSvg = `
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="4" fill="#374151"/>
        <path d="M24 14C18.48 14 14 18.48 14 24C14 29.52 18.48 34 24 34C29.52 34 34 29.52 34 24C34 18.48 29.52 14 24 14ZM24 30C20.69 30 18 27.31 18 24C18 20.69 20.69 18 24 18C27.31 18 30 20.69 30 24C30 27.31 27.31 30 24 30Z" fill="#9CA3AF"/>
        <circle cx="24" cy="24" r="3" fill="#9CA3AF"/>
      </svg>
    `;

    return new NextResponse(placeholderSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
}
