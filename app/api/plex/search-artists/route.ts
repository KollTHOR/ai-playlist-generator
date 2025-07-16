/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  const { PLEX_TOKEN, PLEX_SERVER_URL } = process.env;

  if (!PLEX_TOKEN || !PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex configuration" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { recommendedArtists, recommendedAlbums } = body;

    // Get music libraries
    const librariesResponse = await axios.get(
      `${PLEX_SERVER_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`,
      { headers: { Accept: "application/json" } }
    );

    const musicLibraries =
      librariesResponse.data.MediaContainer.Directory?.filter(
        (lib: any) => lib.type === "artist"
      ) || [];

    const artistAvailability = [];
    const albumAvailability = [];

    // Check artist availability
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
            )}&X-Plex-Token=${PLEX_TOKEN}`,
            { headers: { Accept: "application/json" } }
          );

          if (searchResponse.data.MediaContainer.Metadata?.length > 0) {
            found = true;
            artistData = searchResponse.data.MediaContainer.Metadata[0];
            break;
          }
        } catch (searchError) {
          console.log(`Search failed for artist: ${recommendedArtist.name}`);
        }
      }

      artistAvailability.push({
        ...recommendedArtist,
        available: found,
        plexData: artistData,
      });
    }

    // Check album availability
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
            )}&X-Plex-Token=${PLEX_TOKEN}`,
            { headers: { Accept: "application/json" } }
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
              break;
            }
          }
        } catch (searchError) {
          console.log(`Search failed for album: ${recommendedAlbum.album}`);
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
  } catch (error) {
    console.error("Artist search error:", error);
    return NextResponse.json(
      { error: "Failed to search for artists" },
      { status: 500 }
    );
  }
}
