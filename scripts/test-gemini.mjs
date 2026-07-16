import { readFileSync } from "fs";
import { resolve } from "path";
import { GoogleGenAI } from "@google/genai";

const envPath = resolve(process.cwd(), ".env.local");
const envText = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

const apiKey = env.GEMINI_API_KEY?.trim();
const model = env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const fallback = env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-3-flash-preview";

if (!apiKey) {
  console.error("FAIL: GEMINI_API_KEY missing in .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function tryModel(name) {
  try {
    const response = await ai.models.generateContent({
      model: name,
      contents: "Reply with exactly: OK",
      config: { maxOutputTokens: 16, temperature: 0 },
    });
    console.log(`OK: ${name} -> ${response.text?.trim() ?? "(empty)"}`);
    return true;
  } catch (error) {
    const status = error?.status ?? "?";
    const message = error?.message ?? String(error);
    console.error(`FAIL: ${name} (${status}) ${message.slice(0, 200)}`);
    return false;
  }
}

console.log("Testing Gemini API...");
let ok = await tryModel(model);
if (!ok && fallback !== model) {
  ok = await tryModel(fallback);
}
process.exit(ok ? 0 : 1);
