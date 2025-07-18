/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getEnvVar, isTauri } from "@/lib/tauriApi";

async function getPlexConfig(): Promise<{
  PLEX_TOKEN: string;
  PLEX_SERVER_URL: string;
}> {
  if (isTauri()) {
    return {
      PLEX_TOKEN: await getEnvVar("PLEX_TOKEN"),
      PLEX_SERVER_URL: await getEnvVar("PLEX_SERVER_URL"),
    };
  }
  return {
    PLEX_TOKEN: process.env.PLEX_TOKEN || "",
    PLEX_SERVER_URL: process.env.PLEX_SERVER_URL || "",
  };
}

export async function GET(request: NextRequest) {
  const { PLEX_TOKEN, PLEX_SERVER_URL } = await getPlexConfig();

  if (!PLEX_TOKEN || !PLEX_SERVER_URL) {
    return NextResponse.json(
      { error: "Missing Plex configuration" },
      { status: 500 }
    );
  }

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

    const allGenres = new Set<string>();
    const allMoods = new Set<string>();
    const allStyles = new Set<string>();

    for (const library of musicLibraries) {
      // Get all genres from this library
      const genresResponse = await axios.get(
        `${PLEX_SERVER_URL}/library/sections/${library.key}/genre?X-Plex-Token=${PLEX_TOKEN}`,
        { headers: { Accept: "application/json" } }
      );

      if (genresResponse.data.MediaContainer.Directory) {
        genresResponse.data.MediaContainer.Directory.forEach((genre: any) => {
          allGenres.add(genre.title);
        });
      }

      // Get all moods from this library
      try {
        const moodsResponse = await axios.get(
          `${PLEX_SERVER_URL}/library/sections/${library.key}/mood?X-Plex-Token=${PLEX_TOKEN}`,
          { headers: { Accept: "application/json" } }
        );

        if (moodsResponse.data.MediaContainer.Directory) {
          moodsResponse.data.MediaContainer.Directory.forEach((mood: any) => {
            allMoods.add(mood.title);
          });
        }
      } catch (moodError) {
        console.log("Moods not available for this library");
      }

      // Get all styles from this library
      try {
        const stylesResponse = await axios.get(
          `${PLEX_SERVER_URL}/library/sections/${library.key}/style?X-Plex-Token=${PLEX_TOKEN}`,
          { headers: { Accept: "application/json" } }
        );

        if (stylesResponse.data.MediaContainer.Directory) {
          stylesResponse.data.MediaContainer.Directory.forEach((style: any) => {
            allStyles.add(style.title);
          });
        }
      } catch (styleError) {
        console.log("Styles not available for this library");
      }
    }

    const response = {
      genres: Array.from(allGenres).sort(),
      moods: Array.from(allMoods).sort(),
      styles: Array.from(allStyles).sort(),
      totalGenres: allGenres.size,
      totalMoods: allMoods.size,
      totalStyles: allStyles.size,
    };

    console.log(
      `Found ${response.totalGenres} genres, ${response.totalMoods} moods, ${response.totalStyles} styles`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Genre discovery error:", error);
    return NextResponse.json(
      {
        error: "Failed to discover library genres",
        genres: [],
        moods: [],
        styles: [],
        totalGenres: 0,
        totalMoods: 0,
        totalStyles: 0,
      },
      { status: 500 }
    );
  }
}
