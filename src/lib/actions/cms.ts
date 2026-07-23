"use server";

import { revalidateTag } from "next/cache";

import { CACHE_TAGS, STORAGE_BUCKET } from "@/lib/constants";
import {
  isLocalCategoriesStore,
  softDeleteLocalCategory,
  upsertLocalCategory,
} from "@/lib/dev/local-categories";
import {
  reorderLocalGallery,
  reorderLocalProducts,
  getLocalSettings,
  saveLocalSettings,
  softDeleteLocalGalleryItem,
  softDeleteLocalProduct,
  softDeleteLocalProject,
  upsertLocalGalleryItem,
  upsertLocalProduct,
  upsertLocalProject,
  listLocalProducts,
  listLocalProductSlugs,
} from "@/lib/dev/local-cms-data";
import { isLocalDevCms, needsServiceRoleForWrites, RLS_DEV_HINT, SERVICE_ROLE_REQUIRED_MSG, UPLOAD_SERVICE_ROLE_REQUIRED_MSG } from "@/lib/dev/local-mode";
import {
  assertPersistableMediaUrl,
  findInvalidPersistedMediaUrls,
} from "@/lib/media/storage-url";
import {
  isLocalDevStorage,
  registerLocalMediaAsset,
  saveLocalUpload,
} from "@/lib/dev/local-uploads";
import { createEntitySlug } from "@/lib/format";
import {
  ensureUniqueSlugFromList,
  isSlugUniqueViolation,
  resolveUniqueProductSlug,
  resolveUniqueSlug,
} from "@/lib/products/unique-slug";
import { normalizePhone, serializePhoneList } from "@/lib/phone/e164";
import { createCmsClient } from "@/lib/supabase/cms-client";
import { createStorageWriteClient } from "@/lib/supabase/storage-client";
import {
  uploadFileAndRegisterAsset,
  uploadFileToStorage,
} from "@/lib/upload/server-upload";
import { requireAdmin, requirePermission } from "@/lib/supabase/auth";
import { softDeleteItem } from "@/lib/actions/trash";
import { actionErrorMessage } from "@/lib/actions/action-utils";
import type { ActionResult } from "@/lib/actions/action-types";
import { logActionError, parseFormJson } from "@/lib/actions/action-helpers";
import {
  logSettingsStep,
  logUploadStep,
  patchWebsiteSettingsBranding,
  upsertSeoSettingsRow,
  upsertWebsiteSettingsRow,
  type SettingsWritePayload,
} from "@/lib/settings/persist-settings";
import type { Category, EmailAddress, GalleryItem, Product, Project, WebsiteSettings } from "@/types/database";

function revalidateAll() {
  revalidateTag(CACHE_TAGS.settings);
  revalidateTag(CACHE_TAGS.homepage);
  revalidateTag(CACHE_TAGS.testimonials);
  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.projects);
  revalidateTag(CACHE_TAGS.gallery);
  revalidateTag(CACHE_TAGS.media);
  revalidateTag(CACHE_TAGS.dashboard);
}

export async function uploadImage(
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();
  logUploadStep("action-start");

  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "general";

  if (!file) {
    logUploadStep("no-file");
    return { success: false, error: "No file provided" };
  }

  const uploaded = await uploadFileAndRegisterAsset(file, folder, file.name);
  if (!uploaded.success) {
    logUploadStep("upload-failed", { error: uploaded.error });
    logActionError("upload-image", uploaded.error);
    return uploaded;
  }

  logUploadStep("action-success");
  return { success: true, data: uploaded.data.publicUrl };
}

export type BrandingField = "company_logo" | "favicon_url";

export async function uploadBrandingImage(
  formData: FormData,
): Promise<ActionResult<{ url: string; settings: WebsiteSettings }>> {
  await requirePermission("settings");
  logUploadStep("branding-start");

  const field = formData.get("field") as BrandingField | null;
  const file = formData.get("file") as File | null;

  if (field !== "company_logo" && field !== "favicon_url") {
    return { success: false, error: "Invalid branding field." };
  }

  if (!file) {
    return { success: false, error: "No file provided." };
  }

  if (!isLocalDevCms() && needsServiceRoleForWrites()) {
    logUploadStep("branding-blocked-no-service-role");
    return { success: false, error: UPLOAD_SERVICE_ROLE_REQUIRED_MSG };
  }

  if (isLocalDevStorage()) {
    try {
      const { url, storagePath } = await saveLocalUpload(file, "branding");
      await registerLocalMediaAsset(file, "branding", storagePath, url);
      const saved = await saveLocalSettings({ [field]: url });
      revalidateTag(CACHE_TAGS.settings);
      revalidateTag(CACHE_TAGS.dashboard);
      return { success: true, data: { url, settings: saved } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  const uploaded = await uploadFileAndRegisterAsset(file, "branding", file.name);
  if (!uploaded.success) {
    logActionError("upload-branding", uploaded.error);
    return uploaded;
  }

  const supabase = await createStorageWriteClient();
  const { data, error } = await patchWebsiteSettingsBranding(
    supabase,
    field,
    uploaded.data.publicUrl,
  );

  if (error) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([uploaded.data.path]);
    logUploadStep("branding-db-error", { message: error });
    return { success: false, error: actionErrorMessage(error) };
  }

  if (!data) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([uploaded.data.path]);
    return {
      success: false,
      error: "Upload succeeded but settings could not be updated.",
    };
  }

  revalidateTag(CACHE_TAGS.settings);
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.media);
  logUploadStep("branding-success", { field });

  return {
    success: true,
    data: { url: uploaded.data.publicUrl, settings: data },
  };
}

export async function saveBrandingUrl(
  field: BrandingField,
  url: string | null,
): Promise<ActionResult<WebsiteSettings>> {
  await requirePermission("settings");
  logSettingsStep("branding-url-save", { field, hasUrl: !!url });

  if (!isLocalDevCms() && needsServiceRoleForWrites()) {
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  if (url) {
    const invalid = findInvalidPersistedMediaUrls([
      { url, label: field === "company_logo" ? "Logo" : "Favicon" },
    ]);
    if (invalid) {
      return { success: false, error: invalid };
    }
  }

  if (isLocalDevCms()) {
    const saved = await saveLocalSettings({ [field]: url });
    revalidateTag(CACHE_TAGS.settings);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  const supabase = await createStorageWriteClient();
  const { data, error } = await patchWebsiteSettingsBranding(
    supabase,
    field,
    url,
  );

  if (error) {
    return { success: false, error: actionErrorMessage(error) };
  }

  if (!data) {
    return { success: false, error: "Settings row was not returned." };
  }

  revalidateTag(CACHE_TAGS.settings);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data };
}

export async function updateWebsiteSettings(
  formData: FormData,
): Promise<ActionResult<WebsiteSettings>> {
  await requirePermission("settings");
  logSettingsStep("action-start");

  if (needsServiceRoleForWrites()) {
    logSettingsStep("blocked-no-service-role");
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  let email_addresses: EmailAddress[] = [];
  let theme_colors: SettingsWritePayload["theme_colors"] = null;

  try {
    email_addresses = JSON.parse(
      (formData.get("email_addresses") as string) || "[]",
    ) as EmailAddress[];
    theme_colors = JSON.parse(
      (formData.get("theme_colors") as string) || "null",
    ) as SettingsWritePayload["theme_colors"];
  } catch {
    return { success: false, error: "Invalid form data (JSON parse failed)." };
  }

  const includeLocation =
    formData.has("latitude") ||
    formData.has("longitude") ||
    formData.has("company_address") ||
    formData.has("google_maps_url");

  let locationFields = {
    google_maps_url: (formData.get("google_maps_url") as string) || null,
    company_address: (formData.get("company_address") as string) || null,
    latitude: parseOptionalNumber(formData.get("latitude")),
    longitude: parseOptionalNumber(formData.get("longitude")),
  };

  if (!includeLocation) {
    if (isLocalDevCms()) {
      const current = await getLocalSettings();
      locationFields = {
        google_maps_url: current.google_maps_url,
        company_address: current.company_address,
        latitude: current.latitude,
        longitude: current.longitude,
      };
    } else {
      const supabase = await createCmsClient();
      const { data: current } = await supabase
        .from("website_settings")
        .select("google_maps_url, company_address, latitude, longitude")
        .limit(1)
        .maybeSingle();
      if (current) {
        locationFields = {
          google_maps_url: current.google_maps_url,
          company_address: current.company_address,
          latitude: current.latitude,
          longitude: current.longitude,
        };
      }
    }
  }

  const rawPhone = (formData.get("phone_number") as string) || "";
  const rawWhatsapp = (formData.get("whatsapp_number") as string) || "";

  const payload: SettingsWritePayload = {
    company_logo: (formData.get("company_logo") as string) || null,
    favicon_url: (formData.get("favicon_url") as string) || null,
    company_name: (formData.get("company_name") as string) || "Nova Home Decor",
    company_description: (formData.get("company_description") as string) || null,
    phone_number: serializePhoneList([rawPhone]),
    whatsapp_number:
      normalizePhone(rawWhatsapp)?.e164 ?? (rawWhatsapp.trim() || null),
    ...locationFields,
    working_hours: (formData.get("working_hours") as string) || null,
    facebook_url: (formData.get("facebook_url") as string) || null,
    instagram_url: (formData.get("instagram_url") as string) || null,
    tiktok_url: (formData.get("tiktok_url") as string) || null,
    telegram_url: (formData.get("telegram_url") as string) || null,
    youtube_url: (formData.get("youtube_url") as string) || null,
    email_addresses,
    theme_colors,
  };

  logSettingsStep("payload-ready", {
    company_name: payload.company_name,
    has_logo: !!payload.company_logo,
    has_favicon: !!payload.favicon_url,
  });

  const invalidMedia = findInvalidPersistedMediaUrls([
    { url: payload.company_logo, label: "Logo" },
    { url: payload.favicon_url, label: "Favicon" },
  ]);
  if (invalidMedia) {
    logSettingsStep("invalid-media-url");
    return { success: false, error: invalidMedia };
  }

  if (isLocalDevCms()) {
    logSettingsStep("local-dev-save");
    const saved = await saveLocalSettings(payload);
    revalidateTag(CACHE_TAGS.settings);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();
  const { data, error } = await upsertWebsiteSettingsRow(supabase, payload);

  if (error) {
    const hint = error.includes("row-level security") ? RLS_DEV_HINT : "";
    logSettingsStep("supabase-error", { error });
    return { success: false, error: actionErrorMessage(error + hint) };
  }

  if (!data) {
    logSettingsStep("no-data-returned");
    return {
      success: false,
      error: "Save completed but no settings row was returned.",
    };
  }

  revalidateTag(CACHE_TAGS.settings);
  logSettingsStep("action-success", { id: data.id });
  return { success: true, data };
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function saveCategory(
  formData: FormData,
): Promise<ActionResult<Category>> {
  await requirePermission("categories");
  const id = formData.get("id") as string | null;

  const nameI18nResult = parseFormJson<Record<string, string>>(
    formData.get("name_i18n"),
    {},
  );
  if (!nameI18nResult.ok) {
    return { success: false, error: nameI18nResult.error };
  }
  const descI18nResult = parseFormJson<Record<string, string>>(
    formData.get("description_i18n"),
    {},
  );
  if (!descI18nResult.ok) {
    return { success: false, error: descI18nResult.error };
  }

  const nameI18n = nameI18nResult.value;
  const descI18n = descI18nResult.value;
  const name =
    nameI18n.ku ||
    nameI18n.en ||
    nameI18n.ar ||
    (formData.get("name") as string);

  if (!name?.trim()) {
    return { success: false, error: "Category name is required." };
  }

  const requestedSlug =
    (formData.get("slug") as string)?.trim() || name;

  const basePayload = {
    name,
    name_i18n: nameI18n,
    description: descI18n.ku || descI18n.en || descI18n.ar || null,
    description_i18n: descI18n,
    image_url: (formData.get("image_url") as string) || null,
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || null,
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "true",
  };

  if (isLocalCategoriesStore()) {
    const slug = createEntitySlug(requestedSlug, "category");
    const saved = await upsertLocalCategory({
      id,
      ...basePayload,
      slug,
    });
    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();
  const slug = await resolveUniqueSlug(supabase, requestedSlug, "category", {
    excludeId: id,
  });
  const payload = { ...basePayload, slug };

  let { data, error } = id
    ? await supabase
        .from("categories")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase.from("categories").insert(payload).select("*").single();

  if (error && isSlugUniqueViolation(error.message)) {
    const retrySlug = await resolveUniqueSlug(
      supabase,
      `${slug}-${Date.now().toString(36)}`,
      "category",
      { excludeId: id },
    );
    const retry = id
      ? await supabase
          .from("categories")
          .update({ ...payload, slug: retrySlug })
          .eq("id", id)
          .select("*")
          .single()
      : await supabase
          .from("categories")
          .insert({ ...payload, slug: retrySlug })
          .select("*")
          .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.categories);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: data as Category };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requirePermission("categories");
  if (isLocalCategoriesStore()) {
    await softDeleteLocalCategory(id);
    revalidateTag(CACHE_TAGS.categories);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }
  return softDeleteItem("categories", id);
}

export async function saveProduct(
  formData: FormData,
): Promise<ActionResult<Product>> {
  await requirePermission("products");
  const id = formData.get("id") as string | null;

  if (process.env.NODE_ENV === "development") {
    console.info("[products:save] start", { id: id ?? "new" });
  }

  const nameI18nResult = parseFormJson<Record<string, string>>(
    formData.get("name_i18n"),
    {},
  );
  if (!nameI18nResult.ok) {
    return { success: false, error: nameI18nResult.error };
  }
  const descI18nResult = parseFormJson<Record<string, string>>(
    formData.get("description_i18n"),
    {},
  );
  if (!descI18nResult.ok) {
    return { success: false, error: descI18nResult.error };
  }
  const imagesResult = parseFormJson<string[]>(formData.get("images"), []);
  if (!imagesResult.ok) {
    return { success: false, error: imagesResult.error };
  }
  const relatedResult = parseFormJson<string[]>(
    formData.get("related_product_ids"),
    [],
  );
  if (!relatedResult.ok) {
    return { success: false, error: relatedResult.error };
  }

  const nameI18n = nameI18nResult.value;
  const descI18n = descI18nResult.value;
  const images = imagesResult.value;
  const name =
    nameI18n.ku ||
    nameI18n.en ||
    nameI18n.ar ||
    (formData.get("name") as string);

  if (!name?.trim()) {
    return { success: false, error: "Product name is required." };
  }

  const categoryId = (formData.get("category_id") as string) || "";
  const requestedSlug =
    ((formData.get("slug") as string) || "").trim() || name;

  if (!isLocalDevCms()) {
    const invalidMedia = findInvalidPersistedMediaUrls(
      images.map((url, index) => ({
        url,
        label: `Product image ${index + 1}`,
      })),
    );
    if (invalidMedia) {
      if (process.env.NODE_ENV === "development") {
        console.error("[products:save] invalid-media", invalidMedia);
      }
      return { success: false, error: invalidMedia };
    }
  }

  if (isLocalDevCms()) {
    const slug = ensureUniqueSlugFromList(
      requestedSlug,
      await listLocalProductSlugs(id),
    );

    if (process.env.NODE_ENV === "development") {
      console.info("[products:save] local", { slug, images: images.length });
    }

    const saved = await upsertLocalProduct({
      id: id ?? undefined,
      name,
      name_i18n: nameI18n,
      slug,
      category_id: categoryId || null,
      description: descI18n.ku || descI18n.en || descI18n.ar || null,
      description_i18n: descI18n,
      price: formData.get("price") ? Number(formData.get("price")) : null,
      price_currency: (() => {
        const rawPrice = String(formData.get("price") ?? "").trim();
        if (!rawPrice) return null;
        const cur = String(formData.get("price_currency") ?? "IQD").toUpperCase();
        return cur === "USD" ? "USD" : "IQD";
      })(),
      sku: (formData.get("sku") as string)?.trim() || null,
      image_url: images[0] || (formData.get("image_url") as string) || null,
      images,
      video_url: (formData.get("video_url") as string)?.trim() || null,
      related_product_ids: relatedResult.value,
      status: ((formData.get("status") as string) || "draft") as Product["status"],
      is_featured: formData.get("is_featured") === "true",
      is_active: formData.get("is_active") === "true",
      sort_order: Number(formData.get("sort_order") || 0),
      seo_title: (formData.get("seo_title") as string) || null,
      seo_description: (formData.get("seo_description") as string) || null,
      og_image: (formData.get("og_image") as string) || null,
    });
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  if (categoryId) {
    const supabaseCheck = await createCmsClient();
    const { data: categoryRow, error: categoryError } = await supabaseCheck
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      return {
        success: false,
        error: actionErrorMessage(categoryError.message),
      };
    }
    if (!categoryRow) {
      return { success: false, error: "Selected category was not found." };
    }
  }

  const supabase = await createCmsClient();
  const slug = await resolveUniqueProductSlug(supabase, requestedSlug, {
    excludeId: id,
  });

  const payload = {
    name,
    name_i18n: nameI18n,
    slug,
    category_id: categoryId || null,
    description: descI18n.ku || descI18n.en || descI18n.ar || null,
    description_i18n: descI18n,
    price: formData.get("price") ? Number(formData.get("price")) : null,
    price_currency: (() => {
      const rawPrice = String(formData.get("price") ?? "").trim();
      if (!rawPrice) return null;
      const cur = String(formData.get("price_currency") ?? "IQD").toUpperCase();
      return cur === "USD" ? "USD" : "IQD";
    })(),
    sku: (formData.get("sku") as string)?.trim() || null,
    image_url: images[0] || (formData.get("image_url") as string) || null,
    images,
    video_url: (formData.get("video_url") as string)?.trim() || null,
    related_product_ids: relatedResult.value,
    status: (formData.get("status") as string) || "draft",
    is_featured: formData.get("is_featured") === "true",
    is_active: formData.get("is_active") === "true",
    sort_order: Number(formData.get("sort_order") || 0),
    seo_title: (formData.get("seo_title") as string) || null,
    seo_description: (formData.get("seo_description") as string) || null,
    og_image: (formData.get("og_image") as string) || null,
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[products:save] supabase", {
      id: id ?? "new",
      slug,
      category_id: payload.category_id,
      images: images.length,
    });
  }

  let { data, error } = id
    ? await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase.from("products").insert(payload).select("*").single();

  // Race-safe retry once if unique slug still collided
  if (error && isSlugUniqueViolation(error.message)) {
    const retrySlug = await resolveUniqueProductSlug(
      supabase,
      `${slug}-${Date.now().toString(36)}`,
      {
        excludeId: id,
      },
    );
    const retryPayload = { ...payload, slug: retrySlug };
    if (process.env.NODE_ENV === "development") {
      console.warn("[products:save] slug-collision-retry", {
        from: slug,
        to: retrySlug,
      });
    }
    const retry = id
      ? await supabase
          .from("products")
          .update(retryPayload)
          .eq("id", id)
          .select("*")
          .single()
      : await supabase.from("products").insert(retryPayload).select("*").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[products:save] error", error.message);
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: data as Product };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requirePermission("products");
  if (isLocalDevCms()) {
    await softDeleteLocalProduct(id);
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }
  return softDeleteItem("products", id);
}

export async function duplicateProduct(
  id: string,
): Promise<ActionResult<string>> {
  await requirePermission("products");

  if (isLocalDevCms()) {
    const products = await listLocalProducts();
    const product = products.find((item) => item.id === id);
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    const copy = await upsertLocalProduct({
      category_id: product.category_id,
      name: `${product.name} (Copy)`,
      name_i18n: product.name_i18n,
      slug: ensureUniqueSlugFromList(
        `${product.slug}-copy`,
        products.map((p) => p.slug),
      ),
      description: product.description,
      description_i18n: product.description_i18n,
      price: product.price,
      price_currency: product.price_currency ?? null,
      sku: product.sku,
      image_url: product.image_url,
      images: product.images,
      video_url: product.video_url,
      related_product_ids: product.related_product_ids,
      status: "draft",
      is_featured: false,
      is_active: false,
      sort_order: product.sort_order + 1,
      seo_title: product.seo_title,
      seo_description: product.seo_description,
      og_image: product.og_image,
    });
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: copy.id };
  }

  const supabase = await createCmsClient();
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !product) {
    return {
      success: false,
      error: fetchError?.message ?? "Product not found",
    };
  }

  const copySlug = await resolveUniqueProductSlug(
    supabase,
    `${product.slug}-copy`,
  );

  const copy = {
    category_id: product.category_id,
    name: `${product.name} (Copy)`,
    name_i18n: product.name_i18n,
    slug: copySlug,
    description: product.description,
    description_i18n: product.description_i18n,
    price: product.price,
    price_currency: product.price_currency ?? null,
    sku: product.sku,
    image_url: product.image_url,
    images: product.images,
    video_url: product.video_url,
    related_product_ids: product.related_product_ids,
    status: "draft",
    is_featured: false,
    is_active: false,
    sort_order: product.sort_order + 1,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    og_image: product.og_image,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(copy)
    .select("id")
    .single();

  if (error && isSlugUniqueViolation(error.message)) {
    const retrySlug = await resolveUniqueProductSlug(
      supabase,
      `${copySlug}-${Date.now().toString(36)}`,
    );
    const retry = await supabase
      .from("products")
      .insert({ ...copy, slug: retrySlug })
      .select("id")
      .single();
    if (retry.error) {
      return { success: false, error: actionErrorMessage(retry.error.message) };
    }
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: retry.data.id };
  }

  if (error) return { success: false, error: actionErrorMessage(error.message) };

  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: data.id };
}

export async function reorderProducts(ids: string[]): Promise<ActionResult> {
  await requirePermission("products");
  if (isLocalDevCms()) {
    await reorderLocalProducts(ids);
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }

  const supabase = await createCmsClient();
  const updates = ids.map((id, index) =>
    supabase.from("products").update({ sort_order: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true };
}

export async function saveProject(
  formData: FormData,
): Promise<ActionResult<Project>> {
  await requirePermission("projects");
  const id = formData.get("id") as string | null;

  const titleI18nResult = parseFormJson<Record<string, string>>(
    formData.get("title_i18n"),
    {},
  );
  if (!titleI18nResult.ok) {
    return { success: false, error: titleI18nResult.error };
  }
  const descI18nResult = parseFormJson<Record<string, string>>(
    formData.get("description_i18n"),
    {},
  );
  if (!descI18nResult.ok) {
    return { success: false, error: descI18nResult.error };
  }
  const imagesResult = parseFormJson<string[]>(formData.get("images"), []);
  if (!imagesResult.ok) {
    return { success: false, error: imagesResult.error };
  }

  const titleI18n = titleI18nResult.value;
  const descI18n = descI18nResult.value;
  const title =
    titleI18n.ku ||
    titleI18n.en ||
    titleI18n.ar ||
    (formData.get("title") as string);

  if (!title?.trim()) {
    return { success: false, error: "Project title is required." };
  }

  const requestedSlug =
    (formData.get("slug") as string)?.trim() || title;

  const basePayload = {
    title,
    title_i18n: titleI18n,
    description: descI18n.ku || descI18n.en || descI18n.ar || null,
    description_i18n: descI18n,
    client_name: (formData.get("client_name") as string) || null,
    location: (formData.get("location") as string) || null,
    cover_image: (formData.get("cover_image") as string) || null,
    images: imagesResult.value,
    completed_at: (formData.get("completed_at") as string) || null,
    is_featured: formData.get("is_featured") === "true",
    is_active: formData.get("is_active") === "true",
    sort_order: Number(formData.get("sort_order") || 0),
  };

  if (isLocalDevCms()) {
    const slug = createEntitySlug(requestedSlug, "project");
    const saved = await upsertLocalProject({
      id: id ?? undefined,
      ...basePayload,
      slug,
    });
    revalidateTag(CACHE_TAGS.projects);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();
  const slug = await resolveUniqueSlug(supabase, requestedSlug, "project", {
    excludeId: id,
  });
  const payload = { ...basePayload, slug };

  let { data, error } = id
    ? await supabase
        .from("projects")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase.from("projects").insert(payload).select("*").single();

  if (error && isSlugUniqueViolation(error.message)) {
    const retrySlug = await resolveUniqueSlug(
      supabase,
      `${slug}-${Date.now().toString(36)}`,
      "project",
      { excludeId: id },
    );
    const retry = id
      ? await supabase
          .from("projects")
          .update({ ...payload, slug: retrySlug })
          .eq("id", id)
          .select("*")
          .single()
      : await supabase
          .from("projects")
          .insert({ ...payload, slug: retrySlug })
          .select("*")
          .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.projects);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: data as Project };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requirePermission("projects");
  if (isLocalDevCms()) {
    await softDeleteLocalProject(id);
    revalidateTag(CACHE_TAGS.projects);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }
  return softDeleteItem("projects", id);
}

export async function saveGalleryItem(
  formData: FormData,
): Promise<ActionResult<GalleryItem>> {
  await requirePermission("gallery");
  const id = formData.get("id") as string | null;

  const titleI18nResult = parseFormJson<Record<string, string>>(
    formData.get("title_i18n"),
    {},
  );
  if (!titleI18nResult.ok) {
    return { success: false, error: titleI18nResult.error };
  }
  const captionI18nResult = parseFormJson<Record<string, string>>(
    formData.get("caption_i18n"),
    {},
  );
  if (!captionI18nResult.ok) {
    return { success: false, error: captionI18nResult.error };
  }

  const titleI18n = titleI18nResult.value;
  const captionI18n = captionI18nResult.value;
  const imageUrl = formData.get("image_url") as string;

  if (!imageUrl?.trim()) {
    return { success: false, error: "Image is required." };
  }

  const payload = {
    title:
      titleI18n.ku ||
      titleI18n.en ||
      titleI18n.ar ||
      (formData.get("title") as string) ||
      null,
    title_i18n: Object.keys(titleI18n).length ? titleI18n : null,
    image_url: imageUrl,
    caption:
      captionI18n.ku ||
      captionI18n.en ||
      captionI18n.ar ||
      (formData.get("caption") as string) ||
      null,
    caption_i18n: Object.keys(captionI18n).length ? captionI18n : null,
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "true",
  };

  if (isLocalDevCms()) {
    const saved = await upsertLocalGalleryItem({ id: id ?? undefined, ...payload });
    revalidateTag(CACHE_TAGS.gallery);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();

  const { data, error } = id
    ? await supabase
        .from("gallery_items")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase.from("gallery_items").insert(payload).select("*").single();

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.gallery);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: data as GalleryItem };
}

export async function saveGalleryBatch(
  formData: FormData,
): Promise<ActionResult<GalleryItem[]>> {
  await requirePermission("gallery");

  const imagesResult = parseFormJson<string[]>(formData.get("images"), []);
  if (!imagesResult.ok) {
    return { success: false, error: imagesResult.error };
  }
  const titleI18nResult = parseFormJson<Record<string, string>>(
    formData.get("title_i18n"),
    {},
  );
  if (!titleI18nResult.ok) {
    return { success: false, error: titleI18nResult.error };
  }
  const captionI18nResult = parseFormJson<Record<string, string>>(
    formData.get("caption_i18n"),
    {},
  );
  if (!captionI18nResult.ok) {
    return { success: false, error: captionI18nResult.error };
  }

  const images = imagesResult.value;
  const titleI18n = titleI18nResult.value;
  const captionI18n = captionI18nResult.value;
  const title =
    titleI18n.ku ||
    titleI18n.en ||
    titleI18n.ar ||
    (formData.get("title") as string) ||
    null;
  const caption =
    captionI18n.ku ||
    captionI18n.en ||
    captionI18n.ar ||
    (formData.get("caption") as string) ||
    null;
  const isActive = formData.get("is_active") === "true";
  const baseOrder = Number(formData.get("sort_order") || 0);

  if (!images.length) {
    return { success: false, error: "No images provided" };
  }

  const rows = images.map((image_url, index) => ({
    title,
    title_i18n: Object.keys(titleI18n).length ? titleI18n : null,
    image_url,
    caption,
    caption_i18n: Object.keys(captionI18n).length ? captionI18n : null,
    sort_order: baseOrder + index,
    is_active: isActive,
  }));

  if (isLocalDevCms()) {
    const saved: GalleryItem[] = [];
    for (const row of rows) {
      saved.push(await upsertLocalGalleryItem(row));
    }
    revalidateTag(CACHE_TAGS.gallery);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();

  const { data, error } = await supabase
    .from("gallery_items")
    .insert(rows)
    .select("*");

  if (error) {
    return { success: false, error: actionErrorMessage(error.message) };
  }

  revalidateTag(CACHE_TAGS.gallery);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true, data: (data ?? []) as GalleryItem[] };
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  await requirePermission("gallery");
  if (isLocalDevCms()) {
    await softDeleteLocalGalleryItem(id);
    revalidateTag(CACHE_TAGS.gallery);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }
  return softDeleteItem("gallery_items", id);
}

export async function reorderGallery(ids: string[]): Promise<ActionResult> {
  await requirePermission("gallery");
  if (isLocalDevCms()) {
    await reorderLocalGallery(ids);
    revalidateTag(CACHE_TAGS.gallery);
    revalidateTag(CACHE_TAGS.dashboard);
    return { success: true };
  }

  const supabase = await createCmsClient();
  const updates = ids.map((id, index) =>
    supabase.from("gallery_items").update({ sort_order: index }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { success: false, error: failed.error.message };

  revalidateTag(CACHE_TAGS.gallery);
  revalidateTag(CACHE_TAGS.dashboard);
  return { success: true };
}

export async function updateSeoSettings(
  formData: FormData,
): Promise<ActionResult<WebsiteSettings>> {
  await requirePermission("seo");
  logSettingsStep("seo-action-start");

  if (needsServiceRoleForWrites()) {
    logSettingsStep("seo-blocked-no-service-role");
    return { success: false, error: SERVICE_ROLE_REQUIRED_MSG };
  }

  const payload = {
    seo_title: (formData.get("seo_title") as string) || null,
    seo_description: (formData.get("seo_description") as string) || null,
    og_image: (formData.get("og_image") as string) || null,
  };

  const invalidMedia = findInvalidPersistedMediaUrls([
    { url: payload.og_image, label: "OG image" },
  ]);
  if (invalidMedia) {
    logSettingsStep("seo-invalid-media-url");
    return { success: false, error: invalidMedia };
  }

  if (isLocalDevCms()) {
    logSettingsStep("seo-local-dev-save");
    const saved = await saveLocalSettings(payload);
    revalidateTag(CACHE_TAGS.settings);
    return { success: true, data: saved };
  }

  const supabase = await createCmsClient();
  const { data, error } = await upsertSeoSettingsRow(supabase, payload);

  if (error) {
    const hint = error.includes("row-level security") ? RLS_DEV_HINT : "";
    logSettingsStep("seo-supabase-error", { error });
    return { success: false, error: actionErrorMessage(error + hint) };
  }

  if (!data) {
    logSettingsStep("seo-no-data-returned");
    return {
      success: false,
      error: "SEO save completed but no settings row was returned.",
    };
  }

  revalidateTag(CACHE_TAGS.settings);
  logSettingsStep("seo-action-success", { id: data.id });
  return { success: true, data };
}

export { revalidateAll };
