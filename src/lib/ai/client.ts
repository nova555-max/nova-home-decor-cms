import { GoogleGenAI } from "@google/genai";

import { assertGeminiConfigured, getGeminiModel } from "@/lib/ai/config";

let client: GoogleGenAI | null = null;

export function getGoogleGenAI(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: assertGeminiConfigured() });
  }
  return client;
}

export function resetGoogleGenAIClient() {
  client = null;
}

export { getGeminiModel };
