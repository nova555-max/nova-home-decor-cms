"use client";

import { useDirection } from "@/hooks";
import { ta } from "@/lib/i18n/admin-dictionaries";

export function useAdminT() {
  const { locale } = useDirection();
  return (key: string) => ta(locale, key);
}
