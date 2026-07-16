import { NextResponse } from "next/server";
import { z } from "zod";

import { buildAdminPrompt } from "@/lib/ai/prompts";
import { parseLocalizedJson, parsePlainText, extractJsonBlock } from "@/lib/ai/parse";
import { geminiGenerateText } from "@/lib/ai/gemini";
import type { AiAdminTask, SeoSocialResult } from "@/lib/ai/types";
import { getGeminiApiKey } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getAdminContext } from "@/lib/queries/admin-users";
import { siteConfig } from "@/config/site";

const taskSchema = z.enum([
  "product_description",
  "project_description",
  "gallery_caption",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_social",
  "translate",
  "improve_grammar",
  "marketing_rewrite",
  "premium_rewrite",
  "short_version",
  "long_version",
] satisfies [AiAdminTask, ...AiAdminTask[]]);

const bodySchema = z.object({
  task: taskSchema,
  locale: z.enum(siteConfig.locales).optional(),
  sourceLocale: z.enum(siteConfig.locales).optional(),
  targetLocales: z.array(z.enum(siteConfig.locales)).optional(),
  multiline: z.boolean().optional(),
  context: z
    .object({
      entityType: z
        .enum(["product", "project", "gallery", "seo", "general"])
        .optional(),
      entityName: z.string().optional(),
      categoryName: z.string().optional(),
      location: z.string().optional(),
      clientName: z.string().optional(),
      existingText: z.string().optional(),
      fieldLabel: z.string().optional(),
      companyName: z.string().optional(),
    })
    .optional(),
});

function parseSeoSocial(raw: string): SeoSocialResult | null {
  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as SeoSocialResult;
    if (parsed.og_title || parsed.structured_data) return parsed;
  } catch {
    /* fall through */
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminContext();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!getGeminiApiKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY to .env.local." },
        { status: 503 },
      );
    }

    const rateKey = `admin-ai-generate:${admin.email}`;
    const rate = checkRateLimit(rateKey);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many AI requests. Please wait before trying again.",
          retryAfterMs: rate.retryAfterMs,
        },
        { status: 429 },
      );
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const prompt = buildAdminPrompt(parsed.data);
    const raw = await geminiGenerateText(prompt, {
      temperature:
        parsed.data.task === "seo_keywords" ? 0.5 : 0.75,
    });

    if (parsed.data.task === "seo_keywords") {
      return NextResponse.json({
        success: true,
        text: parsePlainText(raw),
      });
    }

    if (parsed.data.task === "seo_social") {
      const social = parseSeoSocial(raw);
      if (social) {
        return NextResponse.json({ success: true, social });
      }
    }

    const localized = parseLocalizedJson(raw);
    if (Object.keys(localized).length === 0) {
      return NextResponse.json({
        success: true,
        text: parsePlainText(raw),
      });
    }

    return NextResponse.json({ success: true, localized });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    console.error("[api/ai/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
