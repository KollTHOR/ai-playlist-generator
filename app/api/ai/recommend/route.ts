/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";
import { getEnvVar, isTauri } from "@/lib/tauriApi";

async function getApiKey(): Promise<string> {
  if (isTauri()) {
    return await getEnvVar("OPENROUTER_API_KEY");
  }
  return process.env.OPENROUTER_API_KEY || "";
}

export async function POST(request: NextRequest) {
  const OPENROUTER_API_KEY = await getApiKey();

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const {
      musicProfile,
      artistAvailability,
      albumAvailability,
      playlistLength = 20,
      model = "deepseek/deepseek-r1",
    } = await request.json();

    if (!musicProfile || !artistAvailability || !albumAvailability) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    const availableArtists = artistAvailability.filter((a: any) => a.available);
    const availableAlbums = albumAvailability.filter((a: any) => a.available);

    if (availableArtists.length === 0) {
      return NextResponse.json(
        { error: "No available artists found" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a JSON-only playlist API. You must return a valid JSON array without any formatting, explanations, or markdown. Your response must be parseable JSON that starts with [ and ends with ].`;

    const userPrompt = `Create a ${playlistLength}-song playlist based on this profile and available artists.

MUSIC PROFILE:
Genres: ${musicProfile.primaryGenres?.join(", ") || "Various"}
Moods: ${musicProfile.moods?.join(", ") || "Various"}
Energy: ${musicProfile.energy || "Medium"}

AVAILABLE ARTISTS:
${availableArtists
  .slice(0, 25)
  .map((artist: any, index: number) => `${index + 1}. ${artist.name}`)
  .join("\n")}

AVAILABLE ALBUMS:
${availableAlbums
  .slice(0, 15)
  .map(
    (album: any, index: number) =>
      `${index + 1}. ${album.artist} - ${album.album}`
  )
  .join("\n")}

IMPORTANT: Return only valid JSON array. No markdown, no explanations, no code blocks. Start with [ and end with ]. Use this exact structure:

[
  {
    "artist": "Artist Name",
    "title": "Song Title",
    "album": "Album Name",
    "reason": "Brief explanation"
  }
]

Create exactly ${playlistLength} songs using only the available artists and albums listed above. Focus on variety and flow. Return only the JSON array.`;

    console.log(
      "Generating playlist with",
      availableArtists.length,
      "available artists"
    );

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2500,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Playlist Generator",
        },
        timeout: 60000,
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();
    console.log("AI playlist response length:", aiResponse.length);
    console.log("AI response starts with:", aiResponse.substring(0, 50));
    console.log(
      "AI response ends with:",
      aiResponse.substring(aiResponse.length - 50)
    );

    try {
      const recommendations = JSON.parse(aiResponse);

      if (!Array.isArray(recommendations)) {
        throw new Error("Response is not an array");
      }

      const validRecommendations = recommendations.filter(
        (rec) => rec && typeof rec === "object" && rec.artist && rec.title
      );

      if (validRecommendations.length === 0) {
        throw new Error("No valid recommendations found");
      }

      console.log(
        `Successfully generated ${validRecommendations.length} recommendations`
      );
      return NextResponse.json(validRecommendations);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      console.error("Raw AI response:", aiResponse);

      // Fallback playlist from available artists
      const fallbackRecommendations = availableArtists
        .slice(0, playlistLength)
        .map((artist: any, index: number) => ({
          artist: artist.name,
          title: `Popular Song ${index + 1}`,
          album: "Unknown Album",
          reason: "Fallback recommendation",
        }));

      console.log(
        "Using fallback recommendations:",
        fallbackRecommendations.length,
        "songs"
      );
      return NextResponse.json(fallbackRecommendations);
    }
  } catch (error) {
    console.error("Playlist generation error:", error);

    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json(
          { error: "Request timed out. Please try again." },
          { status: 408 }
        );
      }

      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: "Invalid OpenRouter API key" },
          { status: 401 }
        );
      }

      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate playlist" },
      { status: 500 }
    );
  }
}
