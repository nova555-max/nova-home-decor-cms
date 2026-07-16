import { readFileSync } from "fs";
import { resolve } from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = resolve(process.cwd(), ".env.local");
const envText = readFileSync(envPath, "utf8");
const apiKey = envText
  .split("\n")
  .find((l) => l.startsWith("GEMINI_API_KEY="))
  ?.split("=")
  .slice(1)
  .join("=")
  ?.trim();

if (!apiKey) {
  console.error("No API key");
  process.exit(1);
}

const candidates = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-8b",
  "gemini-3.1-pro-preview",
  "gemini-2.5-pro-preview-06-05",
];

const ai = new GoogleGenAI({ apiKey });

for (const model of candidates) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Say OK",
      config: { maxOutputTokens: 8, temperature: 0 },
    });
    console.log(`WORKS: ${model} -> ${response.text?.trim()}`);
  } catch (error) {
    const status = error?.status ?? "?";
    const msg = (error?.message ?? "").slice(0, 120);
    console.log(`FAIL ${status}: ${model} - ${msg}`);
  }
}
