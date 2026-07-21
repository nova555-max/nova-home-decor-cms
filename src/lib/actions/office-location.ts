"use server";

import { revalidateTag } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { CACHE_TAGS } from "@/lib/constants";
import {
  actionErrorMessage,
  isOfficeLocationRow,
} from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import {
  buildGoogleMapsUrl,
  formatOfficePublicSubtitle,
  validateOfficeLocation,
} from "@/lib/office-location";
import {
  isLocalDevCms,
  needsServiceRoleForWrites,
  SERVICE_ROLE_REQUIRED_MSG,
} from "@/lib/dev/local-mode";
import { saveLocalSettings } from "@/lib/dev/local-cms-data";
import { getAdminOfficeLocation } from "@/lib/queries/office-location";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { requirePermission } from "@/lib/supabase/auth";
import type {
  GeocodedAddress,
  OfficeLocation,
  OfficeLocationPayload,
} from "@/types/office-location";

const LOG_PREFIX = "[office-location:save]";

function logDev(step: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail) {
    console.info(LOG_PREFIX, step, detail);
  } else {
    console.info(LOG_PREFIX, step);
  }
}

async function syncWebsiteSettingsFromOffice(
  office: OfficeLocation,
): Promise<string | null> {
  if (isLocalDevCms()) return null;

  const supabase = await createCmsClient();
  const subtitle = formatOfficePublicSubtitle(office);
  const company_address = subtitle
    ? `${office.name}\n${subtitle}`
    : office.name;

  const { data: existing, error: fetchError } = await supabase
    .from("website_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return actionErrorMessage(fetchError.message);
  }

  const payload = {
    latitude: office.latitude,
    longitude: office.longitude,
    google_maps_url: buildGoogleMapsUrl(office.latitude, office.longitude),
    company_address,
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("website_settings")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      return actionErrorMessage(updateError.message);
    }
  }

  return null;
}

async function saveLocalOffice(office: OfficeLocation): Promise<OfficeLocation> {
  const dir = join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "office-location.json"),
    JSON.stringify(office, null, 2),
    "utf8",
  );
  return office;
}

export async function getOfficeLocationData(): Promise<OfficeLocation | null> {
  await requirePermission("settings");
  return getAdminOfficeLocation();
}

export async function saveOfficeLocation(
  input: OfficeLocationPayload,
): Promise<ActionResult<OfficeLocation>> {
  try {
    await requirePermission("settings");
    const resolvedName = String(input.officeName ?? input.name ?? "").trim();
    logDev("start", {
      name: resolvedName,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    if (!isLocalDevCms() && needsServiceRoleForWrites()) {
      logDev("blocked-no-service-role");
      return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
    }

    const validationError = validateOfficeLocation({
      name: resolvedName,
      latitude: input.latitude,
      longitude: input.longitude,
    });
    if (validationError) {
      logDev("validation-failed", { validationError });
      return { success: false, error: validationError };
    }

    const row: OfficeLocation = {
      id: crypto.randomUUID(),
      name: resolvedName,
      latitude: input.latitude,
      longitude: input.longitude,
      country: input.country ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      street: input.street ?? null,
      is_active: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isLocalDevCms()) {
      const existing = await getAdminOfficeLocation();
      const saved = await saveLocalOffice({
        ...row,
        id: existing?.id ?? row.id,
        created_at: existing?.created_at ?? row.created_at,
      });

      if (!isOfficeLocationRow(saved)) {
        return {
          success: false,
          error: "Local office location could not be verified after save.",
        };
      }

      const subtitle = formatOfficePublicSubtitle(saved);
      await saveLocalSettings({
        latitude: saved.latitude,
        longitude: saved.longitude,
        google_maps_url: buildGoogleMapsUrl(saved.latitude, saved.longitude),
        company_address: subtitle ? `${saved.name}\n${subtitle}` : saved.name,
      });

      revalidateTag(CACHE_TAGS.office);
      revalidateTag(CACHE_TAGS.settings);
      logDev("local-success", { id: saved.id });
      return { success: true, data: saved };
    }

    const supabase = await createCmsClient();
    const rowPayload = {
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      city: row.city,
      district: row.district,
      street: row.street,
      is_active: true,
    };

    const { data: existing, error: existingError } = await supabase
      .from("office_locations")
      .select("id, created_at")
      .eq("is_active", true)
      .maybeSingle();

    if (existingError) {
      logDev("fetch-existing-error", { message: existingError.message });
      return {
        success: false,
        error: actionErrorMessage(existingError.message),
      };
    }

    let data: OfficeLocation | null = null;
    let writeError: string | null = null;

    if (existing?.id) {
      logDev("update-existing", { id: existing.id });
      const result = await supabase
        .from("office_locations")
        .update(rowPayload)
        .eq("id", existing.id)
        .select("*")
        .single();

      data = (result.data as OfficeLocation | null) ?? null;
      writeError = result.error?.message ?? null;
    } else {
      logDev("insert-new");
      const result = await supabase
        .from("office_locations")
        .insert({
          ...row,
          ...rowPayload,
        })
        .select("*")
        .single();

      data = (result.data as OfficeLocation | null) ?? null;
      writeError = result.error?.message ?? null;

      if (writeError?.includes("idx_office_locations_single_active")) {
        logDev("insert-conflict-retry-update");
        const { data: activeRow, error: activeError } = await supabase
          .from("office_locations")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();

        if (!activeError && activeRow?.id) {
          const retry = await supabase
            .from("office_locations")
            .update(rowPayload)
            .eq("id", activeRow.id)
            .select("*")
            .single();
          data = (retry.data as OfficeLocation | null) ?? null;
          writeError = retry.error?.message ?? null;
        }
      }
    }

    if (writeError || !data) {
      logDev("write-failed", { error: writeError });
      return {
        success: false,
        error: actionErrorMessage(
          writeError ?? "Could not save office location.",
        ),
      };
    }

    if (!isOfficeLocationRow(data)) {
      logDev("invalid-response", { data });
      return {
        success: false,
        error: "Database returned an invalid office location.",
      };
    }

    const office = data as OfficeLocation;
    const syncError = await syncWebsiteSettingsFromOffice(office);
    if (syncError) {
      logDev("settings-sync-failed", { error: syncError });
      return { success: false, error: syncError };
    }

    revalidateTag(CACHE_TAGS.office);
    revalidateTag(CACHE_TAGS.settings);
    logDev("success", { id: office.id });
    return { success: true, data: office };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save office location.";
    if (process.env.NODE_ENV === "development") {
      console.error(LOG_PREFIX, "unexpected-error", error);
    }
    return { success: false, error: actionErrorMessage(message) };
  }
}

export async function geocodeOfficeCoordinates(
  latitude: number,
  longitude: number,
): Promise<ActionResult<GeocodedAddress>> {
  try {
    await requirePermission("settings");

    const { resolvePublicEnvWithDefaults } = await import(
      "@/config/public-env-defaults"
    );
    const appUrl = resolvePublicEnvWithDefaults().NEXT_PUBLIC_APP_URL;
    const response = await fetch(
      `${appUrl}/api/geocode/reverse?lat=${latitude}&lng=${longitude}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return { success: false, error: "Could not detect address for this location." };
    }
    const data = (await response.json()) as GeocodedAddress;
    return { success: true, data };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[office-location:geocode]", error);
    }
    return {
      success: false,
      error: actionErrorMessage(
        error instanceof Error ? error.message : "Geocoding failed.",
      ),
    };
  }
}
