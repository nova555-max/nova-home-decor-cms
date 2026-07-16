import { ApiError } from "@google/genai";
import type { Content } from "@google/genai";

import { getGoogleGenAI } from "@/lib/ai/client";
import {
  GeminiApiError,
  getGeminiModels,
  toGeminiApiError,
} from "@/lib/ai/config";
import { coerceToText } from "@/lib/i18n/cms-text";

type GenerateOptions = {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

async function withModelFallback<T>(
  run: (model: string) => Promise<T>,
): Promise<T> {
  const models = getGeminiModels();
  let lastError: GeminiApiError | null = null;

  for (const model of models) {
    try {
      return await run(model);
    } catch (error) {
      const mapped =
        error instanceof ApiError
          ? new GeminiApiError(error.status, error.message)
          : toGeminiApiError(error);
      lastError = mapped;

      const hasNext = model !== models[models.length - 1];
      if (hasNext && (mapped.quotaExceeded || mapped.modelNotFound)) {
        console.warn(`[gemini] ${model} failed (${mapped.status}), trying next model`);
        continue;
      }
      throw mapped;
    }
  }

  throw lastError ?? new GeminiApiError(500, "All Gemini models failed");
}

function buildContents(
  prompt: string,
  history?: Content[],
): Content[] {
  return [
    ...(history ?? []),
    { role: "user", parts: [{ text: prompt }] },
  ];
}

function extractGeminiText(chunk: unknown): string {
  if (chunk == null || typeof chunk !== "object") return "";

  const candidate = (chunk as { text?: unknown }).text;
  if (typeof candidate === "string") return candidate;

  const coerced = coerceToText(candidate);
  if (coerced) return coerced;

  if (process.env.NODE_ENV === "development" && candidate != null) {
    console.warn("[gemini] Unexpected chunk.text payload:", candidate);
  }
  return "";
}

export async function geminiGenerateText(
  prompt: string,
  options?: GenerateOptions,
): Promise<string> {
  const ai = getGoogleGenAI();

  return withModelFallback(async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 4096,
      },
    });

    const text = extractGeminiText(response);
    if (!text) throw new Error("Gemini returned an empty response.");
    return text;
  });
}

export async function geminiStreamText(
  prompt: string,
  options?: GenerateOptions,
  history?: Content[],
): Promise<ReadableStream<Uint8Array>> {
  const ai = getGoogleGenAI();
  const contents = buildContents(prompt, history);

  return withModelFallback(async (model) => {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: options?.systemInstruction,
        temperature: options?.temperature ?? 0.6,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
    });

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = extractGeminiText(chunk);
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          controller.error(
            error instanceof ApiError
              ? new GeminiApiError(error.status, error.message)
              : toGeminiApiError(error),
          );
        }
      },
    });
  });
}

export function historyFromChat(
  messages: { role: "user" | "assistant"; content: string }[],
): Content[] {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

export { GeminiApiError, toGeminiApiError };
