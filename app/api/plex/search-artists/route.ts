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
    const { recommendedArtists, recommendedAlbums, userToken } = body;

    // Validate required data
    if (!userToken) {
      return NextResponse.json(
        { error: "Missing user authentication token" },
        { status: 401 }
      );
    }

    if (!recommendedArtists || !recommendedAlbums) {
      return NextResponse.json(
        { error: "Missing recommended artists or albums data" },
        { status: 400 }
      );
    }

    console.log("Searching for artists with user token...");
    console.log("Recommended artists:", recommendedArtists.length);
    console.log("Recommended albums:", recommendedAlbums.length);

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

    const artistAvailability = [];
    const albumAvailability = [];

    // Check artist availability
    console.log("Checking artist availability...");
    for (const recommendedArtist of recommendedArtists) {
      let found = false;
      let artistData = null;

      for (const library of musicLibraries) {
        try {
          const searchResponse = await axios.get(
            `${PLEX_SERVER_URL}/library/sections/${
              library.key
            }/search?type=8&query=${encodeURIComponent(
              recommendedArtist.name
            )}&X-Plex-Token=${userToken}`,
            {
              headers: { Accept: "application/json" },
              timeout: 5000,
            }
          );

          if (searchResponse.data.MediaContainer.Metadata?.length > 0) {
            found = true;
            artistData = searchResponse.data.MediaContainer.Metadata[0];
            console.log(`Found artist: ${recommendedArtist.name}`);
            break;
          }
        } catch (searchError: any) {
          console.log(
            `Search failed for artist: ${recommendedArtist.name}`,
            searchError.message
          );
        }
      }

      artistAvailability.push({
        ...recommendedArtist,
        available: found,
        plexData: artistData,
      });
    }

    // Check album availability
    console.log("Checking album availability...");
    for (const recommendedAlbum of recommendedAlbums) {
      let found = false;
      let albumData = null;

      for (const library of musicLibraries) {
        try {
          const searchResponse = await axios.get(
            `${PLEX_SERVER_URL}/library/sections/${
              library.key
            }/search?type=9&query=${encodeURIComponent(
              recommendedAlbum.album
            )}&X-Plex-Token=${userToken}`,
            {
              headers: { Accept: "application/json" },
              timeout: 5000,
            }
          );

          if (searchResponse.data.MediaContainer.Metadata?.length > 0) {
            // Check if artist also matches
            const matchingAlbum =
              searchResponse.data.MediaContainer.Metadata.find((album: any) =>
                album.parentTitle
                  ?.toLowerCase()
                  .includes(recommendedAlbum.artist.toLowerCase())
              );

            if (matchingAlbum) {
              found = true;
              albumData = matchingAlbum;
              console.log(
                `Found album: ${recommendedAlbum.album} by ${recommendedAlbum.artist}`
              );
              break;
            }
          }
        } catch (searchError: any) {
          console.log(
            `Search failed for album: ${recommendedAlbum.album}`,
            searchError.message
          );
        }
      }

      albumAvailability.push({
        ...recommendedAlbum,
        available: found,
        plexData: albumData,
      });
    }

    const summary = {
      totalArtistsRecommended: recommendedArtists.length,
      availableArtists: artistAvailability.filter((a) => a.available).length,
      totalAlbumsRecommended: recommendedAlbums.length,
      availableAlbums: albumAvailability.filter((a) => a.available).length,
      artistAvailability,
      albumAvailability,
    };

    console.log(
      `Found ${summary.availableArtists}/${summary.totalArtistsRecommended} artists and ${summary.availableAlbums}/${summary.totalAlbumsRecommended} albums`
    );

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Artist search error:", error);

    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: "Invalid user authentication token" },
        { status: 401 }
      );
    }

    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: "Plex server or library not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to search for artists",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
