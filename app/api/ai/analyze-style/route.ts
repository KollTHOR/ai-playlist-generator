import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

export async function POST(request: NextRequest) {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY) {
    console.error("Missing OpenRouter API key");
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      listeningHistory,
      availableGenres,
      availableMoods,
      availableStyles,
      model = "deepseek/deepseek-r1",
    } = body;

    // Validate input
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

    if (
      !availableGenres ||
      !Array.isArray(availableGenres) ||
      availableGenres.length === 0
    ) {
      return NextResponse.json(
        { error: "No available genres provided" },
        { status: 400 }
      );
    }

    console.log("Analyzing style for", listeningHistory.length, "tracks");
    console.log("Available genres:", availableGenres.length);
    console.log("Available moods:", availableMoods?.length || 0);
    console.log("Available styles:", availableStyles?.length || 0);

    const systemPrompt = `You are a music analysis AI that returns ONLY valid JSON responses. Never use markdown formatting, code blocks, or explanatory text. Always respond with pure JSON that can be directly parsed. You must only use genres, moods, and styles that are provided in the available options.`;

    const userPrompt = `Analyze this music listening history and return the user's musical preferences as a JSON object.

LISTENING HISTORY:
${listeningHistory
  .slice(0, 20)
  .map(
    (track) =>
      `- ${track.grandparentTitle || "Unknown Artist"} - ${
        track.title || "Unknown Track"
      }`
  )
  .join("\n")}

AVAILABLE GENRES IN PLEX LIBRARY:
${availableGenres.slice(0, 50).join(", ")}

AVAILABLE MOODS IN PLEX LIBRARY:
${availableMoods?.slice(0, 30).join(", ") || "None available"}

AVAILABLE STYLES IN PLEX LIBRARY:
${availableStyles?.slice(0, 30).join(", ") || "None available"}

IMPORTANT CONSTRAINTS:
- You MUST only use genres from the "AVAILABLE GENRES" list above
- You MUST only use moods from the "AVAILABLE MOODS" list above (or leave empty if none available)
- You MUST only use styles from the "AVAILABLE STYLES" list above (or leave empty if none available)
- If a genre you would normally choose is not available, pick the closest match from the available options
- Do NOT invent new genres, moods, or styles not in the provided lists

RESPONSE FORMAT REQUIREMENTS:
- Return ONLY the JSON object below
- Do NOT use markdown code blocks
- Do NOT use backticks or formatting
- Do NOT add explanations or comments
- Start your response directly with the opening brace {

REQUIRED JSON STRUCTURE:
{
  "primaryGenres": ["genre1", "genre2", "genre3"],
  "secondaryGenres": ["genre4", "genre5"],
  "moods": ["mood1", "mood2", "mood3"],
  "styles": ["style1", "style2", "style3"],
  "tempo": "fast/moderate/slow",
  "era": "decade-range",
  "energy": "high/medium/low"
}

Based on the listening history above, analyze the musical patterns and return your response using ONLY the available genres, moods, and styles from your Plex library. Start with { and end with }.`;

    console.log("Sending request to OpenRouter with model:", model);

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
        temperature: 0.2,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Playlist Generator",
        },
        timeout: 20000,
      }
    );

    console.log("OpenRouter response status:", response.status);

    const aiResponse = response.data.choices[0].message.content.trim();
    console.log("Raw AI response:", aiResponse);

    // Simple parsing without complex cleaning
    try {
      const musicProfile = JSON.parse(aiResponse);

      // Validate required fields
      if (
        !musicProfile.primaryGenres ||
        !Array.isArray(musicProfile.primaryGenres)
      ) {
        throw new Error("Invalid response: missing primaryGenres array");
      }

      // Validate that all returned genres are in the available list
      const invalidGenres = musicProfile.primaryGenres.filter(
        (genre: string) => !availableGenres.includes(genre)
      );

      if (invalidGenres.length > 0) {
        console.warn("AI returned invalid genres:", invalidGenres);
        // Filter out invalid genres
        musicProfile.primaryGenres = musicProfile.primaryGenres.filter(
          (genre: string) => availableGenres.includes(genre)
        );
      }

      // Ensure all required fields exist with defaults
      musicProfile.secondaryGenres = (
        musicProfile.secondaryGenres || []
      ).filter((genre: string) => availableGenres.includes(genre));
      musicProfile.moods = (musicProfile.moods || []).filter((mood: string) =>
        availableMoods?.includes(mood)
      );
      musicProfile.styles = (musicProfile.styles || []).filter(
        (style: string) => availableStyles?.includes(style)
      );
      musicProfile.tempo = musicProfile.tempo || "moderate";
      musicProfile.era = musicProfile.era || "2000s-2020s";
      musicProfile.energy = musicProfile.energy || "medium";

      console.log(
        "Successfully parsed and validated music profile:",
        musicProfile
      );
      return NextResponse.json(musicProfile);
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      console.error("Raw response that failed:", aiResponse);

      // Smart fallback using available genres
      const fallbackProfile = {
        primaryGenres: availableGenres.slice(0, 3), // Use first 3 available genres
        secondaryGenres: availableGenres.slice(3, 5), // Use next 2 available genres
        moods: availableMoods?.slice(0, 2) || [],
        styles: availableStyles?.slice(0, 2) || [],
        tempo: "moderate",
        era: "2000s-2020s",
        energy: "medium",
      };

      console.log(
        "Using fallback profile with available genres:",
        fallbackProfile
      );
      return NextResponse.json(fallbackProfile);
    }
  } catch (error) {
    console.error("Style analysis error:", error);

    if (error instanceof AxiosError) {
      if (error.code === "ECONNABORTED") {
        return NextResponse.json(
          { error: "Request timed out" },
          { status: 408 }
        );
      }

      if (error.response?.status === 401) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }

      if (error.response?.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `API error: ${error.response?.status || "Unknown"}`,
          details: error.response?.data || error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to analyze musical style",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
