import type { AiConsultantModule } from "@/lib/ai/search/types";
import {
  AI_MODULES,
  DEFAULT_MODULE,
  type ModuleDefinition,
} from "@/lib/ai/modules/registry";

/** Prefer specialized advisors over broad finders when scores tie. */
const MODULE_PRIORITY: Partial<Record<AiConsultantModule, number>> = {
  door_advisor: 12,
  window_advisor: 12,
  kitchen_advisor: 12,
  lighting_advisor: 12,
  marble_advisor: 12,
  material_advisor: 10,
  color_advisor: 10,
  smart_compare: 11,
  budget_planner: 11,
  quote_generator: 11,
  visual_search: 14,
  dream_home_planner: 10,
  interior_designer: 9,
  personal_shopping: 8,
  product_finder: 5,
  sales_consultant: 3,
};

export function detectConsultantModule(
  message: string,
  hasImage: boolean,
  explicit?: AiConsultantModule | null,
): AiConsultantModule {
  if (explicit && AI_MODULES.some((m) => m.id === explicit)) {
    return explicit;
  }

  if (hasImage) {
    if (/compare|vs|versus|بەراورد|مقارنة/i.test(message)) return "smart_compare";
    if (/similar|like|match|هاوشێو|مشابه/i.test(message)) return "similar_products";
    if (/analyze|describe|what do you see|چی دەبینیت/i.test(message)) {
      return "image_understanding";
    }
    return "visual_search";
  }

  let best: ModuleDefinition | null = null;
  let bestScore = 0;

  for (const mod of AI_MODULES) {
    if (!mod.patterns.length) continue;
    let hits = 0;
    for (const pattern of mod.patterns) {
      if (pattern.test(message)) hits += 1;
    }
    if (!hits) continue;
    const priority = MODULE_PRIORITY[mod.id] ?? 1;
    const score = hits * 10 + priority;
    if (score > bestScore) {
      bestScore = score;
      best = mod;
    }
  }

  return best?.id ?? DEFAULT_MODULE;
}
