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
    const { userToken, artist, title, album } = await request.json();

    if (!userToken || !artist || !title) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(`Validating track: ${artist} - ${title}`);

    // Get music libraries
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

    if (musicLibraries.length === 0) {
      return NextResponse.json({
        found: false,
        error: "No music libraries found",
      });
    }

    // Search for the track in each library
    for (const library of musicLibraries) {
      try {
        // First search by artist
        const artistResponse = await axios.get(
          `${PLEX_SERVER_URL}/library/sections/${
            library.key
          }/search?type=8&query=${encodeURIComponent(
            artist
          )}&X-Plex-Token=${userToken}`,
          {
            headers: { Accept: "application/json" },
            timeout: 5000,
          }
        );

        const artists = artistResponse.data.MediaContainer.Metadata || [];

        // Find exact or close artist match
        const matchedArtist = artists.find(
          (a: any) =>
            a.title.toLowerCase() === artist.toLowerCase() ||
            a.title.toLowerCase().includes(artist.toLowerCase()) ||
            artist.toLowerCase().includes(a.title.toLowerCase())
        );

        if (matchedArtist) {
          // Search for tracks by this artist
          const tracksResponse = await axios.get(
            `${PLEX_SERVER_URL}/library/sections/${
              library.key
            }/search?type=10&query=${encodeURIComponent(
              title
            )}&X-Plex-Token=${userToken}`,
            {
              headers: { Accept: "application/json" },
              timeout: 5000,
            }
          );

          const tracks = tracksResponse.data.MediaContainer.Metadata || [];

          // Find matching track
          const matchedTrack = tracks.find((track: any) => {
            const titleMatch =
              track.title.toLowerCase() === title.toLowerCase() ||
              track.title.toLowerCase().includes(title.toLowerCase()) ||
              title.toLowerCase().includes(track.title.toLowerCase());

            const artistMatch =
              track.grandparentTitle?.toLowerCase() === artist.toLowerCase() ||
              track.grandparentTitle
                ?.toLowerCase()
                .includes(artist.toLowerCase()) ||
              artist
                .toLowerCase()
                .includes(track.grandparentTitle?.toLowerCase());

            return titleMatch && artistMatch;
          });

          if (matchedTrack) {
            console.log(
              `Found track: ${matchedTrack.title} by ${matchedTrack.grandparentTitle}`
            );
            return NextResponse.json({
              found: true,
              trackData: {
                title: matchedTrack.title,
                artist: matchedTrack.grandparentTitle,
                album: matchedTrack.parentTitle,
                ratingKey: matchedTrack.ratingKey,
                thumb: matchedTrack.thumb,
                parentThumb: matchedTrack.parentThumb,
                grandparentThumb: matchedTrack.grandparentThumb,
              },
            });
          }
        }
      } catch (searchError: any) {
        console.log(
          `Search error in library ${library.key}:`,
          searchError.message
        );
      }
    }

    // Track not found
    console.log(`Track not found: ${artist} - ${title}`);
    return NextResponse.json({
      found: false,
      error: "Track not found in library",
    });
  } catch (error) {
    console.error("Track validation error:", error);
    return NextResponse.json(
      {
        found: false,
        error: "Failed to validate track",
      },
      { status: 500 }
    );
  }
}
