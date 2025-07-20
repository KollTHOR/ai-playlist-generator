/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

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
      trackAvailability,
      playlistLength = 20,
      model = "deepseek/deepseek-r1",
    } = await request.json();

    if (!musicProfile || !trackAvailability) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    const availableTracks = trackAvailability.filter((t: any) => t.available);

    if (availableTracks.length === 0) {
      return NextResponse.json(
        { error: "No available tracks found" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a JSON-only playlist API. You must return a valid JSON array without any formatting, explanations, or markdown. Your response must be parseable JSON that starts with [ and ends with ].`;

    const userPrompt = `Create a ${playlistLength}-song playlist from these available tracks.

MUSIC PROFILE:
Genres: ${musicProfile.primaryGenres?.join(", ") || "Various"}
Moods: ${musicProfile.moods?.join(", ") || "Various"}
Energy: ${musicProfile.energy || "Medium"}

AVAILABLE TRACKS:
${availableTracks
  .slice(0, 40)
  .map(
    (track: any, index: number) =>
      `${index + 1}. ${track.artist} - ${track.title} (${track.album}) - ${
        track.reason
      }`
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

Select exactly ${playlistLength} tracks from the available tracks above. Focus on creating a cohesive flow while maximizing diversity across different artists. Do not repeat the same artist unless absolutely necessary for flow. Return only the JSON array.`;

    console.log(
      "Generating playlist with",
      availableTracks.length,
      "available tracks"
    );

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
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

      // Fallback playlist from available tracks
      const fallbackRecommendations = availableTracks
        .slice(0, playlistLength)
        .map((track: any) => ({
          artist: track.artist,
          title: track.title,
          album: track.album,
          reason: "Fallback recommendation",
        }));

      console.log(
        "Using fallback recommendations:",
        fallbackRecommendations.length,
        "tracks"
      );
      return NextResponse.json(fallbackRecommendations);
    }
  } catch (error) {
    console.error("Playlist generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate playlist" },
      { status: 500 }
    );
  }
}
