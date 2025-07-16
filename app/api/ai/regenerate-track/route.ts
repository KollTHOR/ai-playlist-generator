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
      artistAvailability,
      albumAvailability,
      excludeTrack,
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

    const systemPrompt = `You are a JSON-only music recommendation API. You must return a valid JSON object without any formatting, explanations, or markdown. Your response must be parseable JSON that starts with { and ends with }.`;

    const userPrompt = `Generate a single song recommendation based on this profile and available artists.

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

${
  excludeTrack
    ? `EXCLUDE THIS TRACK: ${excludeTrack.artist} - ${excludeTrack.title}`
    : ""
}

IMPORTANT: Return only valid JSON object. No markdown, no explanations, no code blocks. Start with { and end with }. Use this exact structure:

{
  "artist": "Artist Name",
  "title": "Song Title",
  "album": "Album Name",
  "reason": "Brief explanation"
}

Generate exactly 1 song using only the available artists and albums listed above. ${
      excludeTrack ? "Make sure it is different from the excluded track." : ""
    } Return only the JSON object.`;

    console.log("Generating single track replacement");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
        top_p: 0.9,
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
    console.log("AI track response:", aiResponse);

    try {
      const track = JSON.parse(aiResponse);

      if (!track.artist || !track.title) {
        throw new Error("Invalid track structure");
      }

      console.log("Successfully generated replacement track:", track);
      return NextResponse.json(track);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);

      // Fallback track
      const fallbackTrack = {
        artist: availableArtists[0].name,
        title: "Popular Song",
        album: "Unknown Album",
        reason: "Fallback recommendation",
      };

      console.log("Using fallback track:", fallbackTrack);
      return NextResponse.json(fallbackTrack);
    }
  } catch (error) {
    console.error("Track regeneration error:", error);

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
      { error: "Failed to generate replacement track" },
      { status: 500 }
    );
  }
}
