"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updateWebsiteSettings } from "@/lib/actions/cms";
import { refreshPreservingScroll } from "@/lib/navigation/refresh-preserving-scroll";
import {
  resolvePresetIdFromColors,
  themePayloadForPreset,
  SHOWROOM_THEME_PRESETS,
} from "@/lib/theme/showroom-presets";
import type { EmailAddress, WebsiteSettings } from "@/types/database";
import type { HeroSlide } from "@/types/hero-slides";
import { BrandingImageUpload } from "@/components/admin/branding-image-upload";
import { HeroSliderManager } from "@/components/admin/hero-slider-manager";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PhoneInputField } from "@/components/admin/phone-input";
import { useAdminT } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import {
  MAX_PHONE_NUMBERS,
  phoneSlotsFromStored,
  toPhoneInputValue,
} from "@/lib/phone/e164";
import {
  isValidEmail,
  isValidPhone,
  validateContactFields,
} from "@/lib/validation/contact";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SettingsFormProps = {
  settings: WebsiteSettings | null;
  heroSlides?: HeroSlide[];
};

function toFormState(settings: WebsiteSettings | null) {
  const presetId = resolvePresetIdFromColors(settings?.theme_colors);
  return {
    company_logo: settings?.company_logo ?? "",
    favicon_url: settings?.favicon_url ?? "",
    company_name: settings?.company_name ?? "Nova Home Decor",
    company_description: settings?.company_description ?? "",
    phone_numbers: phoneSlotsFromStored(settings?.phone_number),
    whatsapp_number: toPhoneInputValue(settings?.whatsapp_number) ?? "",
    working_hours: settings?.working_hours ?? "",
    facebook_url: settings?.facebook_url ?? "",
    instagram_url: settings?.instagram_url ?? "",
    tiktok_url: settings?.tiktok_url ?? "",
    snapchat_url: settings?.snapchat_url ?? "",
    email_addresses: settings?.email_addresses ?? [],
    theme_preset_id: presetId,
    theme_colors: themePayloadForPreset(presetId),
  };
}

function syncBrandingFromSettings(
  settings: WebsiteSettings,
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
) {
  setForm((prev) => ({
    ...prev,
    company_logo: settings.company_logo ?? "",
    favicon_url: settings.favicon_url ?? "",
  }));
}

type FormState = ReturnType<typeof toFormState>;

export function SettingsForm({
  settings,
  heroSlides = [],
}: SettingsFormProps) {
  const t = useAdminT();
  const router = useRouter();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [form, setForm] = useState<FormState>(() => toFormState(settings));
  const [fieldErrors, setFieldErrors] = useState<{
    phone_indexes?: number[];
    whatsapp_number?: boolean;
    email_indexes?: number[];
  }>({});
  const [isPending, startTransition] = useTransition();
  const isBusy = isPending || isLocked;

  useEffect(() => {
    setForm(toFormState(settings));
  }, [settings]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (process.env.NODE_ENV === "development") {
      console.info("[settings:form] submit");
    }

    const validationError = validateContactFields(form);
    if (validationError) {
      if (validationError === "phone_invalid" || validationError === "phone_limit") {
        setFieldErrors({
          phone_indexes: form.phone_numbers
            .map((phone, index) =>
              phone.trim() && !isValidPhone(phone) ? index : -1,
            )
            .filter((index) => index >= 0),
        });
        toast.error(
          validationError === "phone_limit"
            ? t("settings.phone_limit")
            : t("settings.phone_invalid"),
        );
        return;
      }
      if (validationError === "whatsapp_invalid") {
        setFieldErrors({ whatsapp_number: true });
        toast.error(t("settings.whatsapp_invalid"));
        return;
      }
      const invalidIndexes = form.email_addresses
        .map((entry, index) =>
          entry.email.trim() && !isValidEmail(entry.email) ? index : -1,
        )
        .filter((index) => index >= 0);
      setFieldErrors({ email_indexes: invalidIndexes });
      toast.error(t("settings.email_invalid"));
      return;
    }

    setFieldErrors({});

    const formData = new FormData();
    formData.append("company_logo", form.company_logo);
    formData.append("favicon_url", form.favicon_url);
    formData.append("company_name", form.company_name);
    formData.append("company_description", form.company_description);
    formData.append("phone_number", form.phone_numbers.join(", "));
    formData.append("whatsapp_number", form.whatsapp_number);
    formData.append("working_hours", form.working_hours);
    formData.append("facebook_url", form.facebook_url);
    formData.append("instagram_url", form.instagram_url);
    formData.append("tiktok_url", form.tiktok_url);
    formData.append("snapchat_url", form.snapchat_url);
    formData.append("email_addresses", JSON.stringify(form.email_addresses));
    formData.append("theme_colors", JSON.stringify(form.theme_colors));

    startTransition(async () => {
      await runLocked(async () => {
        const result = await updateWebsiteSettings(formData);
        if (result.success) {
          if (result.data) {
            setForm(toFormState(result.data));
          }
          toast.success(t("common.saved"));
          refreshPreservingScroll(router);
        } else {
          toast.error(result.error);
          if (process.env.NODE_ENV === "development") {
            console.error("[settings:form]", result.error);
          }
        }
      });
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titleKey="pages.settings.title"
        subtitleKey="pages.settings.subtitle"
      />

      {(form.company_logo.includes("/api/dev-uploads") ||
        form.favicon_url.includes("/api/dev-uploads") ||
        form.company_logo.includes("localhost") ||
        form.favicon_url.includes("localhost")) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          {t("settings.branding_reupload_hint")}
        </div>
      )}

      {/* Outside the settings <form> so Enter/buttons never submit company fields. */}
      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("hero_slider.manager_title")}</CardTitle>
          <CardDescription>{t("hero_slider.manager_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <HeroSliderManager initial={heroSlides} embedded />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.identity")}</CardTitle>
          <CardDescription>{t("settings.identity_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <BrandingImageUpload
              field="company_logo"
              value={form.company_logo}
              label={t("settings.company_logo")}
              onSettingsUpdated={(updated) =>
                syncBrandingFromSettings(updated, setForm)
              }
            />
            <BrandingImageUpload
              field="favicon_url"
              value={form.favicon_url}
              label={t("settings.favicon")}
              onSettingsUpdated={(updated) =>
                syncBrandingFromSettings(updated, setForm)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">{t("settings.company_name")}</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  company_name: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_description">
              {t("settings.company_description")}
            </Label>
            <Textarea
              id="company_description"
              value={form.company_description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  company_description: e.target.value,
                }))
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            {t("settings.location")}
          </CardTitle>
          <CardDescription>{t("office_location.settings_link_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink
            href="/admin/office-location"
            variant="outline"
            className="rounded-xl"
          >
            {t("office_location.open_manager")}
          </ButtonLink>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("settings.phones")}</CardTitle>
            <CardDescription>{t("settings.phones_desc")}</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={form.phone_numbers.length >= MAX_PHONE_NUMBERS}
            onClick={() =>
              setForm((prev) => {
                if (prev.phone_numbers.length >= MAX_PHONE_NUMBERS) return prev;
                return {
                  ...prev,
                  phone_numbers: [...prev.phone_numbers, ""],
                };
              })
            }
          >
            <Plus className="size-4" /> {t("settings.add_phone")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.phone_numbers.map((phone, index) => (
            <div
              key={`phone-${index}`}
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`phone_number_${index}`}>
                  {t("settings.phone")} {index + 1}
                  {index === 0 ? ` (${t("settings.phone_primary")})` : ""}
                </Label>
                <PhoneInputField
                  id={`phone_number_${index}`}
                  value={phone}
                  onChange={(value) => {
                    setFieldErrors((prev) => ({
                      ...prev,
                      phone_indexes: prev.phone_indexes?.filter(
                        (i) => i !== index,
                      ),
                    }));
                    setForm((prev) => {
                      const next = [...prev.phone_numbers];
                      next[index] = value;
                      return { ...prev, phone_numbers: next };
                    });
                  }}
                  aria-invalid={fieldErrors.phone_indexes?.includes(index)}
                />
              </div>
              {form.phone_numbers.length > 1 ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="mt-8"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      phone_numbers: prev.phone_numbers.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">{t("settings.whatsapp")}</Label>
            <PhoneInputField
              id="whatsapp_number"
              value={form.whatsapp_number}
              onChange={(value) => {
                setFieldErrors((prev) => ({ ...prev, whatsapp_number: false }));
                setForm((prev) => ({ ...prev, whatsapp_number: value }));
              }}
              aria-invalid={fieldErrors.whatsapp_number}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("settings.emails")}</CardTitle>
            <CardDescription>{t("settings.emails_desc")}</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                email_addresses: [
                  ...prev.email_addresses,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    email: "",
                  },
                ],
              }))
            }
          >
            <Plus className="size-4" /> {t("settings.add_email")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.email_addresses.map((entry: EmailAddress, index: number) => (
            <div
              key={entry.id}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                placeholder={t("settings.email_label")}
                value={entry.label}
                onChange={(e) => {
                  const next = [...form.email_addresses];
                  next[index] = { ...entry, label: e.target.value };
                  setForm((prev) => ({ ...prev, email_addresses: next }));
                }}
              />
              <Input
                type="email"
                placeholder="email@example.com"
                value={entry.email}
                aria-invalid={fieldErrors.email_indexes?.includes(index)}
                onChange={(e) => {
                  const next = [...form.email_addresses];
                  next[index] = { ...entry, email: e.target.value };
                  setForm((prev) => ({ ...prev, email_addresses: next }));
                  setFieldErrors((prev) => ({
                    ...prev,
                    email_indexes: prev.email_indexes?.filter(
                      (i) => i !== index,
                    ),
                  }));
                }}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    email_addresses: prev.email_addresses.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.social")}</CardTitle>
          <CardDescription>{t("settings.social_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="facebook_url">{t("settings.facebook")}</Label>
            <Input
              id="facebook_url"
              type="url"
              value={form.facebook_url}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  facebook_url: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram_url">{t("settings.instagram")}</Label>
            <Input
              id="instagram_url"
              type="url"
              value={form.instagram_url}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  instagram_url: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok_url">{t("settings.tiktok")}</Label>
            <Input
              id="tiktok_url"
              type="url"
              value={form.tiktok_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tiktok_url: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="snapchat_url">{t("settings.snapchat")}</Label>
            <Input
              id="snapchat_url"
              type="url"
              value={form.snapchat_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, snapchat_url: e.target.value }))
              }
              placeholder="https://snapchat.com/add/..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.working_hours")}</CardTitle>
          <CardDescription>{t("settings.working_hours_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="working_hours">{t("settings.working_hours")}</Label>
            <Textarea
              id="working_hours"
              value={form.working_hours}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  working_hours: e.target.value,
                }))
              }
              placeholder={t("settings.working_hours_placeholder")}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("settings.theme")}</CardTitle>
          <CardDescription>{t("settings.theme_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            {t("settings.theme_dark_hint")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWROOM_THEME_PRESETS.map((preset) => {
              const selected = form.theme_preset_id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      theme_preset_id: preset.id,
                      theme_colors: themePayloadForPreset(preset.id),
                    }))
                  }
                  className={cn(
                    "rounded-2xl border p-3 text-start transition",
                    selected
                      ? "border-primary ring-primary/30 bg-primary/5 ring-2"
                      : "border-border/60 hover:border-primary/40 bg-card",
                  )}
                >
                  <div className="mb-3 flex h-14 overflow-hidden rounded-xl">
                    {preset.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-full flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium">
                    {t(
                      `settings.theme_presets.${preset.nameKey}` as "settings.theme",
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {selected
                      ? t("settings.theme_selected")
                      : t("settings.theme_select")}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isBusy}
        size="lg"
        className="rounded-xl"
      >
        {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
        {isBusy ? t("common.saving") : t("settings.save")}
      </Button>
      </form>
    </div>
  );
}
