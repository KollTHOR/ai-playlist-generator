import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { OpenRouterModel, ModelOption } from "@/types";

export async function GET(request: NextRequest) {
  const { OPENROUTER_API_KEY } = process.env;

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const response = await axios.get("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const models: OpenRouterModel[] = response.data.data;

    // Transform models into our format
    const formattedModels: ModelOption[] = models.map((model) => {
      const [provider, ...modelParts] = model.id.split("/");
      const isFree =
        model.pricing.prompt === "0" && model.pricing.completion === "0";

      return {
        id: model.id,
        name: model.name,
        provider: provider,
        isFree: isFree,
        contextLength: model.context_length,
        description: model.description,
        category: model.architecture?.modality || "text",
      };
    });

    // Sort by: free models first, then by provider name, then by model name
    const sortedModels = formattedModels.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      if (a.provider !== b.provider)
        return a.provider.localeCompare(b.provider);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(sortedModels);
  } catch (error) {
    console.error("OpenRouter models API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
