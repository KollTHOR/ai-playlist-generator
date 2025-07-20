import { NextRequest, NextResponse } from "next/server";
import { PlexAPI } from "@lukehagar/plexjs";
import {
  CreatePlaylistQueryParamType,
  Smart,
} from "@lukehagar/plexjs/sdk/models/operations";
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
    const body: PlaylistRequest & { userToken: string } = await request.json();
    const { title, trackIds, userToken } = body;

    console.log("Request body parsed:", {
      title,
      trackIdsCount: trackIds?.length || 0,
      trackIds: trackIds?.slice(0, 5),
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

    // Initialize Plex API client
    console.log("🔧 Initializing Plex API client...");
    const client = new PlexAPI({
      serverURL: PLEX_SERVER_URL,
      accessToken: userToken,
    });

    // Get server identity for machine identifier
    console.log("🔍 Getting server identity...");
    const identity = await client.server.getServerIdentity();
    const machineIdentifier =
      identity.object?.mediaContainer?.machineIdentifier;

    if (!machineIdentifier) {
      console.error("❌ No machine identifier found");
      return NextResponse.json(
        { error: "Failed to get server machine identifier" },
        { status: 500 }
      );
    }

    console.log("✅ Machine identifier found:", machineIdentifier);

    // Step 1: Create empty playlist
    console.log("🎵 Step 1: Creating empty playlist...");
    const playlistResponse = await client.playlists.createPlaylist({
      title: title,
      type: CreatePlaylistQueryParamType.Audio,
      smart: Smart.Zero,
      uri: "", // Empty URI to create empty playlist
    });

    console.log("✅ Empty playlist creation response received");

    const playlistMetadata = playlistResponse.object?.mediaContainer?.metadata;
    if (!playlistMetadata || playlistMetadata.length === 0) {
      console.error("❌ No playlist metadata returned");
      return NextResponse.json(
        { error: "Failed to create playlist: no metadata returned" },
        { status: 500 }
      );
    }

    const playlist = playlistMetadata[0];
    const playlistId = playlist.ratingKey;

    console.log("✅ Empty playlist created successfully:", {
      id: playlistId,
      title: playlist.title,
      leafCount: playlist.leafCount,
    });

    // Step 2: Add ALL tracks individually (since we know this works)
    console.log("📝 Step 2: Adding tracks individually to playlist...");
    console.log(
      `Adding ${trackIds.length} tracks to playlist ID: ${playlistId}`
    );

    let successfullyAdded = 0;
    const failedTracks = [];
    let totalDuration = 0;

    for (let i = 0; i < trackIds.length; i++) {
      const trackId = trackIds[i];
      const singleTrackUri = `server://${machineIdentifier}/com.plexapp.plugins.library/library/metadata/${trackId}`;

      try {
        console.log(`Adding track ${i + 1}/${trackIds.length}: ${trackId}`);

        const singleAddResponse = await client.playlists.addPlaylistContents(
          parseFloat(playlistId as string),
          singleTrackUri,
          undefined
        );

        const added =
          singleAddResponse.object?.mediaContainer?.leafCountAdded || 0;
        const updatedPlaylist =
          singleAddResponse.object?.mediaContainer?.metadata?.[0];

        if (added > 0) {
          successfullyAdded += added;
          totalDuration = updatedPlaylist?.duration || totalDuration;
          console.log(
            `✅ Successfully added track ${i + 1}/${
              trackIds.length
            } (ID: ${trackId}), total tracks: ${successfullyAdded}`
          );
        } else {
          console.log(
            `⚠️ Track ${
              i + 1
            } (ID: ${trackId}) was not added - leafCountAdded: ${added}`
          );
          failedTracks.push({
            index: i + 1,
            trackId,
            reason: "leafCountAdded was 0",
          });
        }

        // Small delay to avoid overwhelming the server
        if (i < trackIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (singleError) {
        console.error(
          `❌ Failed to add track ${i + 1} (ID: ${trackId}):`,
          singleError
        );
        failedTracks.push({
          index: i + 1,
          trackId,
          reason:
            singleError instanceof Error
              ? singleError.message
              : "Unknown error",
        });
      }
    }

    console.log("✅ Finished adding tracks to playlist");
    console.log(
      `Final stats: ${successfullyAdded}/${trackIds.length} tracks added successfully`
    );

    if (failedTracks.length > 0) {
      console.log("❌ Failed tracks:", failedTracks);
    }

    // Convert duration from milliseconds to a readable format
    const durationMinutes = Math.round(totalDuration / 60000);

    console.log("=== PLAYLIST CREATION DEBUG END ===");

    return NextResponse.json({
      success: true,
      playlistId: playlistId,
      tracksAdded: successfullyAdded,
      totalTracksRequested: trackIds.length,
      failedTracks: failedTracks.length,
      failedTrackDetails: failedTracks,
      playlist: {
        title: title,
        duration: totalDuration,
        durationMinutes: durationMinutes,
        key: playlist.key,
      },
    });
  } catch (error) {
    console.error("❌ Unexpected error in playlist creation:", error);
    console.log("=== PLAYLIST CREATION DEBUG END (ERROR) ===");

    return NextResponse.json(
      {
        error: "Failed to create playlist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
