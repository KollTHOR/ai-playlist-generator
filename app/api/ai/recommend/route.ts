/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";
import { PlexTrack, LastFmTrack, AIRecommendation } from "@/types";

interface RecommendationRequest {
  listeningHistory: PlexTrack[];
  popularTracks: LastFmTrack[];
  userLibrary: PlexTrack[];
  model?: string;
}

export async function POST(request: NextRequest) {
  const { OPENROUTER_API_KEY } = process.env;

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

    // Validate input data
    if (!musicProfile || !artistAvailability || !albumAvailability) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Filter to only available artists and albums
    const availableArtists = artistAvailability.filter((a: any) => a.available);
    const availableAlbums = albumAvailability.filter((a: any) => a.available);

    if (availableArtists.length === 0) {
      return NextResponse.json(
        { error: "No available artists found" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a playlist curator AI. You MUST return only valid JSON arrays with no additional formatting or text. Never use markdown, code blocks, backticks, or explanatory text.

RESPONSE RULES:
- Your response must be valid JSON that can be parsed directly
- Start immediately with [ and end with ]
- No markdown formatting (no backticks, no code blocks)
- No explanatory text before or after the JSON
- Return exactly a JSON array of song objects`;

    const userPrompt = `Create a ${playlistLength}-song playlist based on this musical profile and available artists/albums.

MUSICAL PROFILE:
- Primary Genres: ${musicProfile.primaryGenres.join(", ")}
- Moods: ${musicProfile.moods.join(", ")}
- Styles: ${musicProfile.styles.join(", ")}
- Energy Level: ${musicProfile.energy}

AVAILABLE ARTISTS IN LIBRARY:
${availableArtists
  .map(
    (artist: any, index: number) =>
      `${index + 1}. ${artist.name} - ${artist.reason} (${
        artist.confidence
      } confidence)`
  )
  .join("\n")}

AVAILABLE ALBUMS IN LIBRARY:
${availableAlbums
  .map(
    (album: any, index: number) =>
      `${index + 1}. ${album.artist} - ${album.album} (${
        album.confidence
      } confidence)`
  )
  .join("\n")}

Create a cohesive playlist that:
1. Focuses on the available artists and albums
2. Matches the musical profile
3. Has good flow and variety
4. Balances familiar artists with recommended similar ones
5. Includes both popular and deep cuts

Return exactly ${playlistLength} songs as a JSON array. Each song object must have:
- artist: string
- title: string  
- album: string
- reason: string

Start your response with [ and end with ]. Example format:
[
  {
    "artist": "Artist Name",
    "title": "Song Title",
    "album": "Album Name",
    "reason": "Brief explanation"
  }
]`;

    console.log("Sending playlist generation request...");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent formatting
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Playlist Generator",
        },
        timeout: 30000,
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();
    console.log("Raw AI response:", aiResponse);

    // Direct JSON parsing without cleaning
    try {
      const recommendations = JSON.parse(aiResponse);

      // Validate the response
      if (!Array.isArray(recommendations)) {
        throw new Error("Response is not an array");
      }

      // Ensure all items have required properties
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

      // Enhanced fallback based on available artists
      const fallbackRecommendations = availableArtists
        .slice(0, playlistLength)
        .map((artist: any, index: number) => ({
          artist: artist.name,
          title: `Popular Song ${index + 1}`,
          album: "Unknown Album",
          reason: "Fallback recommendation due to parsing error",
        }));

      console.log("Using fallback recommendations:", fallbackRecommendations);
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

      return NextResponse.json(
        {
          error: `OpenRouter API error: ${error.response?.status || "Unknown"}`,
          details: error.response?.data || error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate playlist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
