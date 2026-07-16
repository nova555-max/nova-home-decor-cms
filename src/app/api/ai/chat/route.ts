import { z } from "zod";

import { buildChatCmsContext, buildChatMeta } from "@/lib/ai/context";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import {
  GeminiApiError,
  geminiStreamText,
  historyFromChat,
} from "@/lib/ai/gemini";
import { getGeminiApiKey } from "@/lib/ai/config";
import {
  buildSearchQueryFromVisual,
  parseIntent,
  visualAttributesToFilters,
} from "@/lib/ai/intent";
import { checkRateLimit, getClientKey } from "@/lib/ai/rate-limit";
import { searchCms } from "@/lib/ai/search";
import { CMS_EMPTY_MESSAGE } from "@/lib/ai/search/cms-content";
import type { CmsSearchResult } from "@/lib/ai/search/types";
import { analyzeImageForSearch } from "@/lib/ai/vision";
import { siteConfig } from "@/config/site";

const MAX_RETRIES = 2;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  locale: z.enum(siteConfig.locales).default("ku"),
  favoriteIds: z.array(z.string().min(1).max(80)).max(40).optional(),
  image: z
    .object({
      data: z.string().min(20).max(8_000_000),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    })
    .optional(),
});

async function streamWithRetry(
  prompt: string,
  systemInstruction: string,
  history: ReturnType<typeof historyFromChat>,
): Promise<ReadableStream<Uint8Array>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await geminiStreamText(
        prompt,
        { systemInstruction, temperature: 0.6, maxOutputTokens: 2048 },
        history,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Stream failed");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Stream failed after retries");
}

export async function POST(request: Request) {
  try {
    if (!getGeminiApiKey()) {
      return new Response(
        JSON.stringify({ error: "AI assistant is temporarily unavailable." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const rateKey = getClientKey(request);
    const rate = checkRateLimit(rateKey);
    if (!rate.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rate.retryAfterMs ?? 60_000) / 1000)),
          },
        },
      );
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, locale: requestLocale, image } = parsed.data;
    const last = messages[messages.length - 1];
    if (last.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const intent = parseIntent(last.content, requestLocale, !!image);
    let searchQuery = intent.searchQuery;
    let filters = intent.filters;

    if (image) {
      const visualAttrs = await analyzeImageForSearch(image.data, image.mimeType);
      filters = { ...filters, ...visualAttributesToFilters(visualAttrs) };
      searchQuery = buildSearchQueryFromVisual(visualAttrs) || last.content;
    }

    const favoriteIds = parsed.data.favoriteIds ?? [];

    let searchResult: CmsSearchResult;
    try {
      searchResult = await searchCms({
        query: searchQuery,
        locale: intent.locale,
        mode: intent.mode,
        module: intent.module,
        filters,
        favoriteIds,
      });
    } catch (searchError) {
      console.error("[api/ai/chat] CMS search failed:", searchError);
      console.error("[api/ai/chat] Search context:", {
        query: searchQuery,
        locale: intent.locale,
        mode: intent.mode,
        module: intent.module,
        geminiConfigured: !!getGeminiApiKey(),
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      });
      searchResult = {
        query: searchQuery,
        locale: intent.locale,
        mode: intent.mode,
        module: intent.module,
        hasExactMatch: false,
        products: [],
        relatedProducts: [],
        crossSellProducts: [],
        upsellProducts: [],
        categories: [],
        projects: [],
        gallery: [],
        companyInfo: null,
        contentStrings: [],
        menuItems: [],
        settingsContext: [],
        homepageMatches: [],
        cmsUnavailableMessage: CMS_EMPTY_MESSAGE,
        alternativesMessage: null,
        totalMatches: 0,
      };
    }

    const cmsContext = buildChatCmsContext(searchResult, intent);
    const systemInstruction = buildChatSystemPrompt(
      intent.locale,
      cmsContext,
      intent.mode,
      intent.module,
    );
    const history = historyFromChat(messages);
    const meta = buildChatMeta(searchResult);

    const userPrompt = image
      ? `${last.content}\n\n[User also uploaded an image for visual product matching]`
      : last.content;

    const stream = await streamWithRetry(userPrompt, systemInstruction, history);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        "X-AI-Meta": Buffer.from(JSON.stringify(meta)).toString("base64url"),
        "X-AI-Locale": intent.locale,
        "X-AI-Mode": intent.mode,
        "X-AI-Module": intent.module,
      },
    });
  } catch (error) {
    if (error instanceof GeminiApiError && error.quotaExceeded) {
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          code: "GEMINI_QUOTA",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    console.error("[api/ai/chat]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
