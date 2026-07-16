/**
 * CMS-scoped AI search entry point.
 * All retrieval is limited to Nova Home Decor CMS tables — never the internet.
 */
export { searchCms, searchCmsByProductIds } from "@/lib/ai/search/index";
export type { CmsSearchResult, SearchFilters } from "@/lib/ai/search/types";
