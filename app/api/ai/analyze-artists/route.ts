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

    const analysisItems = historyItems.slice(0, 50);

    const systemPrompt = `You are a music recommendation AI that ONLY returns raw JSON responses. 

CRITICAL FORMATTING RULES:
- Return ONLY the JSON object, nothing else
- Do NOT use markdown code blocks
- Do NOT use backticks (\`) anywhere in your response
- Do NOT use "json" labels or formatting
- Do NOT add explanatory text before or after the JSON
- Your response must start with { and end with }
- Your response must be valid JSON that can be parsed directly`;

    const userPrompt = `Analyze this listening history and provide music recommendations based on artist and album patterns.

LISTENING HISTORY (${listeningHistory.length} total tracks, analyzing ${
      analysisItems.length
    }):
${analysisItems
  .map((item) => `- ${item.artist} - ${item.album} - ${item.track}`)
  .join("\n")}

${
  listeningHistory.length > 50
    ? `\nNOTE: This is a sample of ${analysisItems.length} tracks from ${listeningHistory.length} total tracks in the user's history.`
    : ""
}

Based on this listening history, provide:
1. Musical profile analysis (genres, moods, styles)
2. Similar artist recommendations (include original artists)
3. Recommended albums from those artists

Return ONLY this JSON structure:
{
  "musicProfile": {
    "primaryGenres": ["genre1", "genre2", "genre3"],
    "moods": ["mood1", "mood2", "mood3"],
    "styles": ["style1", "style2", "style3"],
    "era": "time-period",
    "energy": "high/medium/low"
  },
  "recommendedArtists": [
    {
      "name": "Artist Name",
      "reason": "Similar to [original artist] - [style description]",
      "confidence": "high/medium/low"
    }
  ],
  "recommendedAlbums": [
    {
      "artist": "Artist Name",
      "album": "Album Name",
      "reason": "Similar to [album in history] - [description]",
      "confidence": "high/medium/low"
    }
  ]
}

Provide 15-20 artist recommendations and 20-25 album recommendations based on the listening patterns. Include original artists from the history along with similar ones.

Remember: Return ONLY the JSON object, starting with { and ending with }`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
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
    console.log("AI artist analysis response:", aiResponse);

    try {
      const analysis = JSON.parse(aiResponse);

      // Validate response structure
      if (
        !analysis.musicProfile ||
        !analysis.recommendedArtists ||
        !analysis.recommendedAlbums
      ) {
        throw new Error("Invalid response structure");
      }

      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);

      // Fallback based on listening history
      const uniqueArtists = [
        ...new Set(historyItems.map((item) => item.artist)),
      ];
      const fallbackAnalysis = {
        musicProfile: {
          primaryGenres: ["rock", "pop", "alternative"],
          moods: ["energetic", "varied"],
          styles: ["contemporary"],
          era: "2000s-present",
          energy: "medium",
        },
        recommendedArtists: uniqueArtists.map((artist) => ({
          name: artist,
          reason: "From your listening history",
          confidence: "high",
        })),
        recommendedAlbums: [],
      };

      return NextResponse.json(fallbackAnalysis);
    }
  } catch (error) {
    console.error("Artist analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze artists" },
      { status: 500 }
    );
  }
}
