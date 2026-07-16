import type { SupabaseClient } from "@supabase/supabase-js";

import type { WebsiteSettings } from "@/types/database";

export type SettingsWritePayload = Omit<
  WebsiteSettings,
  "id" | "updated_at" | "seo_title" | "seo_description" | "og_image"
>;

export type SeoWritePayload = Pick<
  WebsiteSettings,
  "seo_title" | "seo_description" | "og_image"
>;

const SETTINGS_LOG_PREFIX = "[settings:save]";
const UPLOAD_LOG_PREFIX = "[upload:image]";

export function logSettingsStep(
  step: string,
  detail?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail) {
    console.info(SETTINGS_LOG_PREFIX, step, detail);
  } else {
    console.info(SETTINGS_LOG_PREFIX, step);
  }
}

export function logUploadStep(
  step: string,
  detail?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") return;
  if (detail) {
    console.info(UPLOAD_LOG_PREFIX, step, detail);
  } else {
    console.info(UPLOAD_LOG_PREFIX, step);
  }
}

export async function upsertWebsiteSettingsRow(
  supabase: SupabaseClient,
  payload: SettingsWritePayload,
): Promise<{ data: WebsiteSettings | null; error: string | null }> {
  logSettingsStep("fetch-existing-row");

  const { data: existing, error: fetchError } = await supabase
    .from("website_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    logSettingsStep("fetch-error", { message: fetchError.message });
    return { data: null, error: fetchError.message };
  }

  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    logSettingsStep("update-row", { id: existing.id });
    const { data, error } = await supabase
      .from("website_settings")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      logSettingsStep("update-error", { message: error.message });
      return { data: null, error: error.message };
    }

    logSettingsStep("update-success", { id: data.id });
    return { data: data as WebsiteSettings, error: null };
  }

  logSettingsStep("insert-row");
  const { data, error } = await supabase
    .from("website_settings")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    logSettingsStep("insert-error", { message: error.message });
    return { data: null, error: error.message };
  }

  logSettingsStep("insert-success", { id: data.id });
  return { data: data as WebsiteSettings, error: null };
}

export type BrandingField = "company_logo" | "favicon_url";

export async function patchWebsiteSettingsBranding(
  supabase: SupabaseClient,
  field: BrandingField,
  url: string | null,
): Promise<{ data: WebsiteSettings | null; error: string | null }> {
  logSettingsStep("branding-patch", { field, hasUrl: !!url });

  const { data: existing, error: fetchError } = await supabase
    .from("website_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    logSettingsStep("branding-fetch-error", { message: fetchError.message });
    return { data: null, error: fetchError.message };
  }

  const patch = {
    [field]: url,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("website_settings")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      logSettingsStep("branding-update-error", { message: error.message });
      return { data: null, error: error.message };
    }

    logSettingsStep("branding-update-success", { id: data.id, field });
    return { data: data as WebsiteSettings, error: null };
  }

  const { data, error } = await supabase
    .from("website_settings")
    .insert({
      company_name: "Nova Home Decor",
      company_logo: field === "company_logo" ? url : null,
      favicon_url: field === "favicon_url" ? url : null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    logSettingsStep("branding-insert-error", { message: error.message });
    return { data: null, error: error.message };
  }

  logSettingsStep("branding-insert-success", { id: data.id, field });
  return { data: data as WebsiteSettings, error: null };
}

export async function upsertSeoSettingsRow(
  supabase: SupabaseClient,
  payload: SeoWritePayload,
): Promise<{ data: WebsiteSettings | null; error: string | null }> {
  logSettingsStep("seo-fetch-existing-row");

  const { data: existing, error: fetchError } = await supabase
    .from("website_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    logSettingsStep("seo-fetch-error", { message: fetchError.message });
    return { data: null, error: fetchError.message };
  }

  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    logSettingsStep("seo-update-row", { id: existing.id });
    const { data, error } = await supabase
      .from("website_settings")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      logSettingsStep("seo-update-error", { message: error.message });
      return { data: null, error: error.message };
    }

    logSettingsStep("seo-update-success", { id: data.id });
    return { data: data as WebsiteSettings, error: null };
  }

  logSettingsStep("seo-insert-row");
  const { data, error } = await supabase
    .from("website_settings")
    .insert({ company_name: "Nova Home Decor", ...row })
    .select("*")
    .single();

  if (error) {
    logSettingsStep("seo-insert-error", { message: error.message });
    return { data: null, error: error.message };
  }

  logSettingsStep("seo-insert-success", { id: data.id });
  return { data: data as WebsiteSettings, error: null };
}
