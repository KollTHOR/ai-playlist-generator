import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PlaylistRequest } from "@/types";

export async function POST(request: NextRequest) {
  const { PLEX_SERVER_URL } = process.env;

  console.log("=== PLAYLIST CREATION DEBUG START ===");
  console.log("PLEX_SERVER_URL:", PLEX_SERVER_URL);

  if (!PLEX_SERVER_URL) {
    console.error("❌ Missing PLEX_SERVER_URL environment variable");
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    // Parse request body
    console.log("📥 Parsing request body...");
    const body: PlaylistRequest & { userToken: string } = await request.json();
    const { title, trackIds, userToken } = body;

    console.log("Request body parsed:", {
      title,
      trackIdsCount: trackIds?.length || 0,
      trackIds: trackIds?.slice(0, 5), // Show first 5 IDs
      userTokenPresent: !!userToken,
      userTokenLength: userToken?.length || 0,
    });

    if (!userToken) {
      console.error("❌ Missing user token");
      return NextResponse.json(
        { error: "Missing user token" },
        { status: 401 }
      );
    }

    if (!trackIds || trackIds.length === 0) {
      console.error("❌ No track IDs provided");
      return NextResponse.json(
        { error: "No track IDs provided" },
        { status: 400 }
      );
    }

    // Step 1: Get the server machine identifier
    console.log("🔍 Step 1: Getting server machine identifier...");
    console.log("Identity endpoint URL:", `${PLEX_SERVER_URL}/identity`);

    let identityResponse;
    try {
      identityResponse = await axios.get(`${PLEX_SERVER_URL}/identity`, {
        headers: {
          Accept: "application/json",
        },
        timeout: 10000,
      });
      console.log("✅ Identity response received");
      console.log("Identity response status:", identityResponse.status);
      console.log(
        "Identity response data:",
        JSON.stringify(identityResponse.data, null, 2)
      );
    } catch (identityError) {
      console.error("❌ Identity request failed:", identityError);
      if (axios.isAxiosError(identityError)) {
        console.error("Identity error details:", {
          message: identityError.message,
          code: identityError.code,
          response: identityError.response?.data,
          status: identityError.response?.status,
        });
      }
      return NextResponse.json(
        { error: "Failed to connect to Plex server for identity" },
        { status: 500 }
      );
    }

    const machineIdentifier =
      identityResponse.data?.MediaContainer?.machineIdentifier;

    if (!machineIdentifier) {
      console.error("❌ No machine identifier found in response");
      console.error(
        "Full identity response:",
        JSON.stringify(identityResponse.data, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to get Plex server machine identifier" },
        { status: 500 }
      );
    }

    console.log("✅ Machine identifier found:", machineIdentifier);

    // Step 2: Create the playlist with correct parameters
    console.log("🎵 Step 2: Creating playlist...");

    // Build the track URIs first
    const trackUris = trackIds
      .map(
        (id) =>
          `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${id}`
      )
      .join(",");

    console.log("Track URIs built:", {
      machineIdentifier,
      trackCount: trackIds.length,
      firstUri: trackUris.split(",")[0],
      uriLength: trackUris.length,
    });

    // Create playlist with tracks in one request
    const createUrl = `${PLEX_SERVER_URL}/playlists`;
    const createParams = {
      type: "audio",
      title: title,
      smart: "0",
      uri: trackUris, // Include tracks during creation
    };

    console.log("Playlist creation URL:", createUrl);
    console.log("Playlist params:", createParams);

    let createResponse;
    try {
      createResponse = await axios.post(createUrl, null, {
        params: createParams,
        headers: {
          Accept: "application/json",
          "X-Plex-Token": userToken,
        },
        timeout: 15000, // Increased timeout for track addition
      });
      console.log("✅ Playlist creation response received");
      console.log("Playlist creation status:", createResponse.status);
      console.log(
        "Playlist creation data:",
        JSON.stringify(createResponse.data, null, 2)
      );
    } catch (createError) {
      console.error("❌ Playlist creation failed:", createError);
      if (axios.isAxiosError(createError)) {
        console.error("Playlist creation error details:", {
          message: createError.message,
          code: createError.code,
          response: createError.response?.data,
          status: createError.response?.status,
          url: createError.config?.url,
          params: createError.config?.params,
        });
      }
      return NextResponse.json(
        { error: "Failed to create playlist on Plex server" },
        { status: 500 }
      );
    }

    const playlistMetadata = createResponse.data?.MediaContainer?.Metadata;
    if (!playlistMetadata || playlistMetadata.length === 0) {
      console.error("❌ No playlist metadata returned");
      console.error(
        "Create response data:",
        JSON.stringify(createResponse.data, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create playlist: no metadata returned" },
        { status: 500 }
      );
    }

    const playlistId = playlistMetadata[0].ratingKey;
    console.log("✅ Playlist created successfully with ID:", playlistId);
    console.log("=== PLAYLIST CREATION DEBUG END ===");

    return NextResponse.json({ success: true, playlistId });
  } catch (error) {
    console.error("❌ Unexpected error in playlist creation:", error);

    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params,
        },
      });
    }

    console.log("=== PLAYLIST CREATION DEBUG END (ERROR) ===");

    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
