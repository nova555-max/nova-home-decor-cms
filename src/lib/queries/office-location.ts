import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/constants";
import { isLocalDevCms } from "@/lib/dev/local-mode";
import {
  STARTUP_QUERY_TIMEOUT_MS,
  withTimeoutFallback,
} from "@/lib/fetch/with-timeout";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createPublicClient } from "@/lib/supabase/public";
import type { OfficeLocation } from "@/types/office-location";

const DEFAULT_OFFICE: OfficeLocation = {
  id: "default",
  name: "Nova Home Decor - Main Office",
  latitude: 36.1911,
  longitude: 44.0092,
  country: "Iraq",
  city: "Erbil",
  district: "Kurdistan Region",
  street: null,
  is_active: true,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function readLocalOffice(): Promise<OfficeLocation | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const raw = await readFile(
      join(process.cwd(), ".data", "office-location.json"),
      "utf8",
    );
    return JSON.parse(raw) as OfficeLocation;
  } catch {
    return null;
  }
}

async function officeFromWebsiteSettings(): Promise<OfficeLocation | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("website_settings")
    .select("company_name, company_address, latitude, longitude")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (data.latitude == null || data.longitude == null) return null;

  return {
    id: "settings-fallback",
    name:
      (data.company_name as string)?.trim() ||
      "Nova Home Decor - Main Office",
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    country: "Iraq",
    city: null,
    district: null,
    street: (data.company_address as string) || null,
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchActiveOffice(): Promise<OfficeLocation | null> {
  if (isLocalDevCms()) {
    return (await readLocalOffice()) ?? DEFAULT_OFFICE;
  }

  const supabase = createPublicClient();
  const fromTable = await withTimeoutFallback(
    (async () => {
      const { data, error } = await supabase
        .from("office_locations")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data as OfficeLocation;
    })(),
    STARTUP_QUERY_TIMEOUT_MS,
    null,
    "fetchActiveOffice",
  );

  if (fromTable) return fromTable;

  const fromSettings = await withTimeoutFallback(
    officeFromWebsiteSettings(),
    STARTUP_QUERY_TIMEOUT_MS,
    null,
    "officeFromWebsiteSettings",
  );

  // Always show a map: settings GPS if set, otherwise Erbil default until Admin → Office Location is filled.
  return fromSettings ?? DEFAULT_OFFICE;
}

export const getActiveOfficeLocation = unstable_cache(
  fetchActiveOffice,
  ["active-office-location-v2"],
  { tags: [CACHE_TAGS.office, CACHE_TAGS.settings], revalidate: 60 },
);

export async function getAdminOfficeLocation(): Promise<OfficeLocation | null> {
  if (isLocalDevCms()) {
    return (await readLocalOffice()) ?? DEFAULT_OFFICE;
  }

  const supabase = await createCmsClient();
  const { data, error } = await supabase
    .from("office_locations")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (!error && data) return data as OfficeLocation;

  return officeFromWebsiteSettings();
}
