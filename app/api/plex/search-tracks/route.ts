/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  const { PLEX_SERVER_URL } = process.env;

  if (!PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex server configuration" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { recommendedTracks, userToken } = body;

    if (!userToken) {
      return NextResponse.json(
        { error: "Missing user authentication token" },
        { status: 401 }
      );
    }

    if (!recommendedTracks) {
      return NextResponse.json(
        { error: "Missing recommended tracks data" },
        { status: 400 }
      );
    }

    console.log("Searching for tracks with user token...");
    console.log("Recommended tracks:", recommendedTracks.length);

    // Get music libraries using user token
    const librariesResponse = await axios.get(
      `${PLEX_SERVER_URL}/library/sections?X-Plex-Token=${userToken}`,
      {
        headers: { Accept: "application/json" },
        timeout: 10000,
      }
    );

    const musicLibraries =
      librariesResponse.data.MediaContainer.Directory?.filter(
        (lib: any) => lib.type === "artist"
      ) || [];

    console.log("Found music libraries:", musicLibraries.length);

    if (musicLibraries.length === 0) {
      return NextResponse.json(
        { error: "No music libraries found in Plex server" },
        { status: 404 }
      );
    }

    const trackAvailability = [];

    // Check track availability
    console.log("Checking track availability...");
    for (const recommendedTrack of recommendedTracks) {
      let found = false;
      let trackData = null;

      for (const library of musicLibraries) {
        try {
          // Search for the specific track
          const searchResponse = await axios.get(
            `${PLEX_SERVER_URL}/library/sections/${
              library.key
            }/search?type=10&query=${encodeURIComponent(
              recommendedTrack.title
            )}&X-Plex-Token=${userToken}`,
            {
              headers: { Accept: "application/json" },
              timeout: 5000,
            }
          );

          if (searchResponse.data.MediaContainer.Metadata?.length > 0) {
            // Find matching track by both title and artist
            const matchingTrack =
              searchResponse.data.MediaContainer.Metadata.find((track: any) => {
                const titleMatch =
                  track.title
                    .toLowerCase()
                    .includes(recommendedTrack.title.toLowerCase()) ||
                  recommendedTrack.title
                    .toLowerCase()
                    .includes(track.title.toLowerCase());

                const artistMatch =
                  track.grandparentTitle
                    ?.toLowerCase()
                    .includes(recommendedTrack.artist.toLowerCase()) ||
                  recommendedTrack.artist
                    .toLowerCase()
                    .includes(track.grandparentTitle?.toLowerCase());

                return titleMatch && artistMatch;
              });

            if (matchingTrack) {
              found = true;
              trackData = matchingTrack;
              console.log(
                `Found track: ${recommendedTrack.title} by ${recommendedTrack.artist}`
              );
              break;
            }
          }
        } catch (searchError: any) {
          console.log(
            `Search failed for track: ${recommendedTrack.title}`,
            searchError.message
          );
        }
      }

      trackAvailability.push({
        ...recommendedTrack,
        available: found,
        plexData: trackData,
      });
    }

    const summary = {
      totalTracksRecommended: recommendedTracks.length,
      availableTracks: trackAvailability.filter((t) => t.available).length,
      trackAvailability,
    };

    console.log(
      `Found ${summary.availableTracks}/${summary.totalTracksRecommended} tracks`
    );

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Track search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search for tracks",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
