import { ApiError } from "@google/genai";

import { getGoogleGenAI } from "@/lib/ai/client";
import {
  GeminiApiError,
  getGeminiModels,
  toGeminiApiError,
} from "@/lib/ai/config";
import type { VisualAttributes } from "@/lib/ai/intent";
import { extractJsonBlock } from "@/lib/ai/parse";

const EMPTY_ATTRIBUTES: VisualAttributes = {
  categories: [],
  styles: [],
  materials: [],
  colors: [],
  keywords: [],
  description: "",
};

export async function analyzeImageForSearch(
  imageBase64: string,
  mimeType: string,
): Promise<VisualAttributes> {
  const ai = getGoogleGenAI();
  const models = getGeminiModels();

  const prompt = `Analyze this interior design / home decor image. Extract visual attributes for product search.
Return JSON only with keys:
- categories: array of matching product types from [door, window, kitchen, lighting, marble, decor, tv]
- styles: array of style words (e.g. modern, luxury, classic)
- materials: array of visible materials (e.g. wood, marble, glass)
- colors: array of dominant colors
- keywords: array of 5-10 search keywords
- description: one sentence describing the image for catalog matching

Do not invent brand names. Focus on observable attributes only.`;

  const imageData = imageBase64.replace(/^data:[^;]+;base64,/, "");
  let lastError: GeminiApiError | null = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageData } },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text;
      if (!text) return EMPTY_ATTRIBUTES;

      try {
        const parsed = JSON.parse(extractJsonBlock(text)) as Partial<VisualAttributes>;
        return {
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          styles: Array.isArray(parsed.styles) ? parsed.styles : [],
          materials: Array.isArray(parsed.materials) ? parsed.materials : [],
          colors: Array.isArray(parsed.colors) ? parsed.colors : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          description:
            typeof parsed.description === "string" ? parsed.description : "",
        };
      } catch {
        return { ...EMPTY_ATTRIBUTES, description: text.slice(0, 200) };
      }
    } catch (error) {
      const mapped =
        error instanceof ApiError
          ? new GeminiApiError(error.status, error.message)
          : toGeminiApiError(error);
      lastError = mapped;

      const hasNext = model !== models[models.length - 1];
      if (hasNext && (mapped.quotaExceeded || mapped.modelNotFound)) {
        console.warn(`[gemini:vision] ${model} failed (${mapped.status}), trying next model`);
        continue;
      }
      throw mapped;
    }
  }

  throw lastError ?? new Error("Vision analysis failed");
}
