/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  const { PLEX_TOKEN, PLEX_SERVER_URL } = process.env;
  const { searchParams } = new URL(request.url);

  if (!PLEX_TOKEN || !PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex configuration" },
      { status: 500 }
    );
  }

  // Extract filter parameters with improved validation
  const genres =
    searchParams
      .get("genres")
      ?.split(",")
      .map((g) => g.trim())
      .filter(Boolean) || [];
  const moods =
    searchParams
      .get("moods")
      ?.split(",")
      .map((m) => m.trim())
      .filter(Boolean) || [];
  const styles =
    searchParams
      .get("styles")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) || [];
  const fetchFiltered = searchParams.get("fetchFiltered") === "true";

  try {
    // Get music libraries
    const librariesResponse = await axios.get(
      `${PLEX_SERVER_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`,
      { headers: { Accept: "application/json" } }
    );

    const musicLibraries =
      librariesResponse.data.MediaContainer.Directory?.filter(
        (lib: any) => lib.type === "artist"
      ) || [];

    let allTracks: any[] = [];
    let filteredTracks: any[] = [];

    for (const library of musicLibraries) {
      // First, get ALL tracks (no limit)
      const allTracksResponse = await axios.get(
        `${PLEX_SERVER_URL}/library/sections/${library.key}/all?type=10&X-Plex-Token=${PLEX_TOKEN}`,
        { headers: { Accept: "application/json" } }
      );

      if (allTracksResponse.data.MediaContainer.Metadata) {
        allTracks = [
          ...allTracks,
          ...allTracksResponse.data.MediaContainer.Metadata,
        ];
      }

      // If filters are provided, also get filtered tracks
      if (
        fetchFiltered &&
        (genres.length > 0 || moods.length > 0 || styles.length > 0)
      ) {
        const filterParams = [`type=10`]; // Track type

        if (genres.length > 0) {
          genres.forEach((genre) => {
            filterParams.push(`genre=${encodeURIComponent(genre)}`);
          });
        }

        if (moods.length > 0) {
          moods.forEach((mood) => {
            filterParams.push(`mood=${encodeURIComponent(mood)}`);
          });
        }

        if (styles.length > 0) {
          styles.forEach((style) => {
            filterParams.push(`style=${encodeURIComponent(style)}`);
          });
        }

        const queryString = filterParams.join("&");

        const filteredTracksResponse = await axios.get(
          `${PLEX_SERVER_URL}/library/sections/${library.key}/all?${queryString}&X-Plex-Token=${PLEX_TOKEN}`,
          { headers: { Accept: "application/json" } }
        );

        if (filteredTracksResponse.data.MediaContainer.Metadata) {
          filteredTracks = [
            ...filteredTracks,
            ...filteredTracksResponse.data.MediaContainer.Metadata,
          ];
        }
      }
    }

    console.log(`Found ${allTracks.length} total tracks`);
    console.log(`Found ${filteredTracks.length} filtered tracks`);

    return NextResponse.json({
      tracks:
        fetchFiltered && filteredTracks.length > 0 ? filteredTracks : allTracks,
      totalLibraryCount: allTracks.length,
      filteredCount: filteredTracks.length,
      hasFilters: genres.length > 0 || moods.length > 0 || styles.length > 0,
      appliedFilters: { genres, moods, styles },
    });
  } catch (error) {
    console.error("Library API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch library",
        tracks: [],
        totalLibraryCount: 0,
        filteredCount: 0,
        hasFilters: false,
        appliedFilters: { genres: [], moods: [], styles: [] },
      },
      { status: 500 }
    );
  }
}
