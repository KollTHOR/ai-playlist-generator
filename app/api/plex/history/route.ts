/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getEnvVar, isTauri } from "@/lib/tauriApi";

async function getPlexServerUrl(): Promise<string> {
  if (isTauri()) {
    return await getEnvVar("PLEX_SERVER_URL");
  }
  return process.env.PLEX_SERVER_URL || "";
}

export async function POST(request: NextRequest) {
  const PLEX_SERVER_URL = await getPlexServerUrl();

  if (!PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    const { userToken, userId } = await request.json();

    if (!userToken) {
      return NextResponse.json(
        { error: "Missing user authentication" },
        { status: 401 }
      );
    }

    console.log("=== DEBUG: Fetching history ===");
    console.log("User ID:", userId);

    // Get user account info to determine admin status
    const userResponse = await axios.get(`https://plex.tv/api/v2/user`, {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": userToken,
      },
    });

    const userData = userResponse.data;
    console.log("User account info:", {
      id: userData.id,
      username: userData.username,
      isAdmin: userData.homeAdmin,
      isHomeUser: userData.home,
    });

    // Get all history
    const response = await axios.get(
      `${PLEX_SERVER_URL}/status/sessions/history/all`,
      {
        headers: {
          Accept: "application/json",
          "X-Plex-Token": userToken,
        },
        timeout: 15000,
      }
    );

    const allHistory = response.data.MediaContainer.Metadata || [];
    console.log("Total history items:", allHistory.length);

    // Create array of possible user IDs to check
    const possibleUserIds = [
      parseInt(userId), // Original user ID
      userData.id, // User account ID from token
      1, // Admin account ID (common default)
    ];

    // Remove duplicates
    const uniqueUserIds = [...new Set(possibleUserIds)];
    console.log("Checking account IDs:", uniqueUserIds);

    // Get music tracks for any of the possible user IDs
    const userMusicHistory = allHistory.filter((item: any) => {
      return item.type === "track" && uniqueUserIds.includes(item.accountID);
    });

    console.log(
      `Found ${userMusicHistory.length} music tracks for user IDs:`,
      uniqueUserIds
    );

    // Log which account IDs actually have music
    if (userMusicHistory.length > 0) {
      const foundAccountIds = [
        ...new Set(
          userMusicHistory.map((item: { accountID: any }) => item.accountID)
        ),
      ];
      console.log("Music found for account IDs:", foundAccountIds);
    }

    return NextResponse.json(userMusicHistory);
  } catch (error: any) {
    console.error("History API error:", error);

    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: "History endpoint not found" },
        { status: 404 }
      );
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        { error: "User does not have access to history" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch user history",
        details: error.message,
        statusCode: error.response?.status,
      },
      { status: 500 }
    );
  }
}
