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
    const body = await request.json();
    const { listeningHistory, model = "deepseek/deepseek-r1" } = body;

    if (
      !listeningHistory ||
      !Array.isArray(listeningHistory) ||
      listeningHistory.length === 0
    ) {
      return NextResponse.json(
        { error: "No listening history provided" },
        { status: 400 }
      );
    }

    // Extract unique artists and albums from listening history
    const historyItems = listeningHistory.map((track) => ({
      artist: track.grandparentTitle || "Unknown Artist",
      album: track.parentTitle || "Unknown Album",
      track: track.title || "Unknown Track",
    }));

    const uniqueArtists = Array.from(
      new Set(historyItems.map((item) => item.artist))
    );

    const systemPrompt = `You are a JSON-only music analysis API. You must return valid JSON without any formatting, explanations, or markdown. Your response must be parseable JSON that starts with { and ends with }.`;

    const userPrompt = `Analyze this music listening history and return a JSON response. 

LISTENING HISTORY:
${historyItems
  .slice(0, 50)
  .map((item) => `${item.artist} - ${item.album} - ${item.track}`)
  .join("\n")}

IMPORTANT: Return only valid JSON. No markdown, no explanations, no code blocks. Start with { and end with }. Use this exact structure:

{
  "musicProfile": {
    "primaryGenres": ["genre1", "genre2", "genre3"],
    "moods": ["mood1", "mood2", "mood3"],
    "styles": ["style1", "style2", "style3"],
    "era": "time-period",
    "energy": "high"
  },
  "recommendedArtists": [
    {
      "name": "Artist Name",
      "reason": "Similar to X - description",
      "confidence": "high"
    }
  ],
  "recommendedAlbums": [
    {
      "artist": "Artist Name",
      "album": "Album Name",
      "reason": "Similar to Y - description",
      "confidence": "high"
    }
  ]
}

Include 15 artist recommendations and 20 album recommendations. Include original artists from the listening history plus similar ones. Return only the JSON object.`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
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
    console.log("AI artist analysis response length:", aiResponse.length);
    console.log("AI response starts with:", aiResponse.substring(0, 50));
    console.log(
      "AI response ends with:",
      aiResponse.substring(aiResponse.length - 50)
    );

    try {
      const analysis = JSON.parse(aiResponse);

      // Validate response structure
      if (
        !analysis.musicProfile ||
        !analysis.recommendedArtists ||
        !analysis.recommendedAlbums
      ) {
        throw new Error("Invalid response structure - missing required fields");
      }

      console.log("Successfully parsed AI analysis:", {
        genres: analysis.musicProfile.primaryGenres?.length || 0,
        artists: analysis.recommendedArtists?.length || 0,
        albums: analysis.recommendedAlbums?.length || 0,
      });

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      console.error("Raw AI response:", aiResponse);

      // Enhanced fallback based on listening history
      const fallbackAnalysis = {
        musicProfile: {
          primaryGenres: ["rock", "pop", "alternative"],
          moods: ["energetic", "varied", "contemporary"],
          styles: ["mainstream", "modern", "diverse"],
          era: "2000s-present",
          energy: "medium",
        },
        recommendedArtists: uniqueArtists.slice(0, 15).map((artist) => ({
          name: artist,
          reason: "From your listening history",
          confidence: "high",
        })),
        recommendedAlbums: historyItems.slice(0, 20).map((item) => ({
          artist: item.artist,
          album: item.album,
          reason: "From your listening history",
          confidence: "high",
        })),
      };

      console.log(
        "Using fallback analysis with",
        fallbackAnalysis.recommendedArtists.length,
        "artists"
      );
      return NextResponse.json(fallbackAnalysis);
    }
  } catch (error) {
    console.error("Artist analysis error:", error);

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
      { error: "Failed to analyze artists" },
      { status: 500 }
    );
  }
}
