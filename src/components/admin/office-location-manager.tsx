"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Save } from "lucide-react";
import { toast } from "sonner";

import { saveOfficeLocation } from "@/lib/actions/office-location";
import {
  ActionTimeoutError,
  withActionTimeout,
} from "@/lib/actions/action-utils";
import { formatOfficePublicSubtitle } from "@/lib/office-location";
import { useAdminT } from "@/hooks";
import { useSubmitLock } from "@/hooks/use-submit-lock";
import type { OfficeLocation } from "@/types/office-location";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { OfficeMapValue } from "@/components/admin/office-map-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAVE_TIMEOUT_MS = 15_000;

const OfficeMapPicker = dynamic(
  () =>
    import("@/components/admin/office-map-picker").then((module) => ({
      default: module.OfficeMapPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border/60 bg-muted/20 sm:min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

type OfficeLocationManagerProps = {
  initial: OfficeLocation | null;
  initialMapsUrl?: string | null;
};

function toMapValue(office: OfficeLocation | null): OfficeMapValue {
  return {
    latitude: office?.latitude ?? null,
    longitude: office?.longitude ?? null,
    country: office?.country ?? null,
    city: office?.city ?? null,
    district: office?.district ?? null,
    street: office?.street ?? null,
  };
}

function mapValuesEqual(
  a: OfficeMapValue,
  b: OfficeMapValue,
  nameA: string,
  nameB: string,
  mapsA: string,
  mapsB: string,
): boolean {
  return (
    nameA.trim() === nameB.trim() &&
    mapsA.trim() === mapsB.trim() &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    (a.country ?? null) === (b.country ?? null) &&
    (a.city ?? null) === (b.city ?? null) &&
    (a.district ?? null) === (b.district ?? null) &&
    (a.street ?? null) === (b.street ?? null)
  );
}

function applySavedOffice(
  office: OfficeLocation,
  setName: (value: string) => void,
  setMapValue: (value: OfficeMapValue) => void,
  setSavedOffice: (value: OfficeLocation) => void,
) {
  setSavedOffice(office);
  setName(office.name);
  setMapValue(toMapValue(office));
}

export function OfficeLocationManager({
  initial,
  initialMapsUrl = null,
}: OfficeLocationManagerProps) {
  const t = useAdminT();
  const router = useRouter();
  const { runLocked, isLocked } = useSubmitLock({
    duplicateMessage: t("common.please_wait"),
  });
  const [name, setName] = useState(initial?.name ?? "");
  const [mapsUrl, setMapsUrl] = useState(initialMapsUrl ?? "");
  const [savedMapsUrl, setSavedMapsUrl] = useState(initialMapsUrl ?? "");
  const [mapValue, setMapValue] = useState<OfficeMapValue>(() =>
    toMapValue(initial),
  );
  const [savedOffice, setSavedOffice] = useState<OfficeLocation | null>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const isSavingRef = useRef(false);
  const failedPayloadKey = useRef<string | null>(null);
  const nameRef = useRef(name);
  const mapRef = useRef(mapValue);
  const mapsUrlRef = useRef(mapsUrl);
  nameRef.current = name;
  mapRef.current = mapValue;
  mapsUrlRef.current = mapsUrl;

  const isBusy = isSaving || isLocked;
  const subtitle = formatOfficePublicSubtitle({
    city: mapValue.city,
    district: mapValue.district,
    country: mapValue.country,
  });

  const hasUnsavedChanges = useMemo(() => {
    if (!savedOffice) return true;
    return !mapValuesEqual(
      mapValue,
      toMapValue(savedOffice),
      name,
      savedOffice.name,
      mapsUrl,
      savedMapsUrl,
    );
  }, [mapValue, mapsUrl, name, savedMapsUrl, savedOffice]);

  const payloadKey = useCallback(
    (nextName: string, nextMap: OfficeMapValue, nextMapsUrl: string) => {
      return JSON.stringify({
        name: nextName.trim(),
        latitude: nextMap.latitude,
        longitude: nextMap.longitude,
        country: nextMap.country,
        city: nextMap.city,
        district: nextMap.district,
        street: nextMap.street,
        google_maps_url: nextMapsUrl.trim(),
      });
    },
    [],
  );

  const persist = useCallback(
    async (
      nextName: string,
      nextMap: OfficeMapValue,
      nextMapsUrl: string,
      showToast = false,
    ) => {
      const trimmedName = nextName.trim();
      if (!trimmedName) {
        if (showToast) toast.error(t("office_location.name_required"));
        return;
      }
      if (nextMap.latitude == null || nextMap.longitude == null) {
        if (showToast) toast.error(t("office_location.location_required"));
        return;
      }

      const key = payloadKey(trimmedName, nextMap, nextMapsUrl);
      if (!showToast && failedPayloadKey.current === key) {
        return;
      }

      const executed = await runLocked(async () => {
        isSavingRef.current = true;
        setIsSaving(true);
        setAutoSaveState("saving");

        try {
          const result = await withActionTimeout(
            saveOfficeLocation({
              name: trimmedName,
              officeName: trimmedName,
              latitude: nextMap.latitude as number,
              longitude: nextMap.longitude as number,
              country: nextMap.country,
              city: nextMap.city,
              district: nextMap.district,
              street: nextMap.street,
              google_maps_url: nextMapsUrl.trim() || null,
            }),
            SAVE_TIMEOUT_MS,
            "Office location save timed out after 15 seconds. Please try again.",
          );

          if (result.success && result.data) {
            failedPayloadKey.current = null;
            applySavedOffice(result.data, setName, setMapValue, setSavedOffice);
            setSavedMapsUrl(nextMapsUrl.trim());
            setMapsUrl(nextMapsUrl.trim());
            setAutoSaveState("saved");
            if (showToast) toast.success(t("common.saved"));
            router.refresh();
            window.setTimeout(() => setAutoSaveState("idle"), 2000);
            return;
          }

          failedPayloadKey.current = key;
          const errorMessage =
            result.success === false
              ? result.error
              : "Could not save office location.";
          setAutoSaveState("idle");
          toast.error(errorMessage);
          if (process.env.NODE_ENV === "development") {
            console.error("[office-location:save]", errorMessage, result);
          }
        } catch (error) {
          failedPayloadKey.current = key;
          setAutoSaveState("idle");
          const message =
            error instanceof ActionTimeoutError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Could not save office location.";
          toast.error(message);
          if (process.env.NODE_ENV === "development") {
            console.error("[office-location:save]", error);
          }
        } finally {
          isSavingRef.current = false;
          setIsSaving(false);
        }
      });

      if (!executed && showToast) {
        toast.message(t("common.please_wait"));
      }
    },
    [payloadKey, runLocked, router, t],
  );

  const scheduleAutoSave = useCallback(
    (nextName: string, nextMap: OfficeMapValue, nextMapsUrl: string) => {
      if (!nextName.trim()) return;
      if (nextMap.latitude == null || nextMap.longitude == null) return;
      if (failedPayloadKey.current === payloadKey(nextName, nextMap, nextMapsUrl))
        return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(nameRef.current, mapRef.current, mapsUrlRef.current, false);
      }, 900);
    },
    [payloadKey, persist],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!hasUnsavedChanges || isSavingRef.current) return;
    scheduleAutoSave(name, mapValue, mapsUrl);
  }, [hasUnsavedChanges, mapValue, mapsUrl, name, scheduleAutoSave]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    failedPayloadKey.current = null;
    void persist(nameRef.current, mapRef.current, mapsUrlRef.current, true);
  };

  const patchMap = (patch: Partial<OfficeMapValue>) => {
    setMapValue((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titleKey="pages.office_location.title"
        subtitleKey="pages.office_location.subtitle"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          {t("office_location.single_active")}
        </Badge>
        {autoSaveState === "saving" ? (
          <Badge variant="outline" className="gap-1 rounded-full">
            <Loader2 className="size-3 animate-spin" />
            {t("office_location.auto_saving")}
          </Badge>
        ) : null}
        {autoSaveState === "saved" ? (
          <Badge
            variant="outline"
            className="gap-1 rounded-full border-emerald-500/30 text-emerald-700"
          >
            <CheckCircle2 className="size-3.5" />
            {t("office_location.auto_saved")}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl border-border/40 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              {t("office_location.map_title")}
            </CardTitle>
            <CardDescription>{t("office_location.map_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <OfficeMapPicker
              value={mapValue}
              onChange={setMapValue}
              hint={t("office_location.map_hint")}
              searchPlaceholder={t("office_location.search_placeholder")}
              searchingLabel={t("office_location.searching")}
              noResultsLabel={t("office_location.no_results")}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle>{t("office_location.details_title")}</CardTitle>
              <CardDescription>{t("office_location.details_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="office-name">{t("office_location.name_label")}</Label>
                <Input
                  id="office-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("office_location.name_placeholder")}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  {t("office_location.name_hint")}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="office-street">{t("office_location.street")}</Label>
                  <Input
                    id="office-street"
                    value={mapValue.street ?? ""}
                    onChange={(e) => patchMap({ street: e.target.value || null })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-city">{t("office_location.city")}</Label>
                  <Input
                    id="office-city"
                    value={mapValue.city ?? ""}
                    onChange={(e) => patchMap({ city: e.target.value || null })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-district">
                    {t("office_location.district")}
                  </Label>
                  <Input
                    id="office-district"
                    value={mapValue.district ?? ""}
                    onChange={(e) =>
                      patchMap({ district: e.target.value || null })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="office-country">
                    {t("office_location.country")}
                  </Label>
                  <Input
                    id="office-country"
                    value={mapValue.country ?? ""}
                    onChange={(e) =>
                      patchMap({ country: e.target.value || null })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-lat">{t("office_location.latitude")}</Label>
                  <Input
                    id="office-lat"
                    type="number"
                    step="any"
                    value={mapValue.latitude ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      patchMap({
                        latitude: raw === "" ? null : Number(raw),
                      });
                    }}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-lng">
                    {t("office_location.longitude")}
                  </Label>
                  <Input
                    id="office-lng"
                    type="number"
                    step="any"
                    value={mapValue.longitude ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      patchMap({
                        longitude: raw === "" ? null : Number(raw),
                      });
                    }}
                    className="rounded-xl font-mono text-sm"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="office-maps-url">
                    {t("office_location.maps_url")}
                  </Label>
                  <Input
                    id="office-maps-url"
                    type="url"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("office_location.maps_url_hint")}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleManualSave}
                disabled={isBusy}
                className="w-full rounded-xl"
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("office_location.save_now")}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle>{t("office_location.preview_title")}</CardTitle>
              <CardDescription>{t("office_location.preview_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
                <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  {t("office_location.public_label")}
                </p>
                <p className="mt-3 font-display text-lg font-medium">
                  {name.trim() || t("office_location.name_placeholder")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subtitle || "—"}
                </p>
                {savedOffice?.updated_at ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {t("office_location.last_saved")}:{" "}
                    {new Date(savedOffice.updated_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
