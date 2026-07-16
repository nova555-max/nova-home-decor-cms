"use client";

import { setRequestContentOverrides } from "@/lib/i18n/cms-text";
import type { ContentStringStore } from "@/types/content";

type ContentTextProviderProps = {
  overrides: ContentStringStore;
  children: React.ReactNode;
};

/** Keeps CMS text overrides available for client components using t(). */
export function ContentTextProvider({
  overrides,
  children,
}: ContentTextProviderProps) {
  setRequestContentOverrides(overrides);
  return children;
}
