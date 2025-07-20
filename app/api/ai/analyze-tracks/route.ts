/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const { listeningHistory, model = "deepseek/deepseek-r1" } =
      await request.json();

    if (!listeningHistory || listeningHistory.length === 0) {
      return NextResponse.json(
        { error: "No listening history provided" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a music analysis AI that returns only JSON. You must return valid JSON without any formatting, explanations, or markdown. Your response must be parseable JSON that starts with { and ends with }.`;

    const userPrompt = `Analyze this music listening history and return a JSON response with track recommendations.

LISTENING HISTORY:
${listeningHistory
  .slice(0, 50)
  .map((item: any) => `${item.artist} - ${item.album} - ${item.track}`)
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
  "recommendedTracks": [
    {
      "artist": "Artist Name",
      "title": "Song Title",
      "album": "Album Name",
      "reason": "Similar to X - description",
      "confidence": "high",
      "genres": ["genre1", "genre2"]
    }
  ]
}

Recommend 30-40 diverse tracks from DIFFERENT artists. Focus on musical similarity but ensure variety across artists, albums, and even genres within the user's taste profile.`;

    console.log("Starting music analysis...");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
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

    try {
      const analysisResult = JSON.parse(aiResponse);

      if (!analysisResult.musicProfile || !analysisResult.recommendedTracks) {
        throw new Error("Invalid response structure");
      }

      console.log(
        `Successfully analyzed music: ${analysisResult.recommendedTracks.length} tracks recommended`
      );

      return NextResponse.json(analysisResult);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      console.error("Raw AI response:", aiResponse);

      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Music analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze music" },
      { status: 500 }
    );
  }
}
