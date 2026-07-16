"use client";

import dynamic from "next/dynamic";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Loader2, MapPin } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";

import { buildGoogleMapsUrl, DEFAULT_MAP_CENTER } from "@/lib/maps";
import { cn } from "@/lib/utils";

const OsmMapPicker = dynamic(
  () =>
    import("@/components/admin/osm-map-picker").then((m) => ({
      default: m.OsmMapPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

const MAP_CONTAINER_STYLE = { width: "100%", height: "360px" };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

export type LocationMapValue = {
  latitude: string;
  longitude: string;
  company_address: string;
  google_maps_url: string;
};

type LocationMapPickerProps = {
  value: LocationMapValue;
  onChange: (value: LocationMapValue) => void;
  apiKey: string;
  className?: string;
  hint?: string;
  loadingLabel?: string;
  errorLabel?: string;
};

function parseCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function reverseGeocode(
  geocoder: google.maps.Geocoder,
  lat: number,
  lng: number,
): Promise<string> {
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]?.formatted_address) {
        resolve(results[0].formatted_address);
        return;
      }
      resolve("");
    });
  });
}

function MapCanvas({
  value,
  onChange,
  apiKey,
  hint,
  loadingLabel,
  errorLabel,
  className,
}: LocationMapPickerProps) {
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const center = useMemo(() => {
    const lat = parseCoordinate(value.latitude);
    const lng = parseCoordinate(value.longitude);
    if (lat != null && lng != null) {
      return { lat, lng };
    }
    return DEFAULT_MAP_CENTER;
  }, [value.latitude, value.longitude]);

  const applyCoordinates = useCallback(
    async (lat: number, lng: number, keepAddress = false) => {
      let address = value.company_address;

      if (!keepAddress && isLoaded && window.google?.maps) {
        geocoderRef.current ??= new google.maps.Geocoder();
        const geocoded = await reverseGeocode(geocoderRef.current, lat, lng);
        if (geocoded) {
          address = geocoded;
        }
      }

      onChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        company_address: address,
        google_maps_url: buildGoogleMapsUrl(lat, lng),
      });
    },
    [isLoaded, onChange, value.company_address],
  );

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat == null || lng == null) return;
      void applyCoordinates(lat, lng);
    },
    [applyCoordinates],
  );

  const handleMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();
      if (lat == null || lng == null) return;
      void applyCoordinates(lat, lng);
    },
    [applyCoordinates],
  );

  if (loadError) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-6 text-center text-sm text-destructive",
          className,
        )}
      >
        {errorLabel ?? "Unable to load Google Maps."}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] items-center justify-center rounded-2xl border border-border/60 bg-muted/30",
          className,
        )}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">{loadingLabel ?? "Loading map"}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative h-[360px] overflow-hidden rounded-2xl border border-border/60 shadow-sm md:h-[360px]">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={15}
          options={MAP_OPTIONS}
          onClick={handleMapClick}
        >
          <Marker
            position={center}
            draggable
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      </div>
      {hint ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function LocationMapPicker({
  value,
  onChange,
  apiKey,
  className,
  hint,
  loadingLabel,
  errorLabel,
  noApiKeyMessage,
}: LocationMapPickerProps & { noApiKeyMessage?: string }) {
  if (!apiKey.trim()) {
    return (
      <div className={cn("space-y-3", className)}>
        <OsmMapPicker value={value} onChange={onChange} hint={hint} />
        <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {noApiKeyMessage ??
            "Using OpenStreetMap (free). Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps."}
        </p>
      </div>
    );
  }

  return (
    <MapCanvas
      value={value}
      onChange={onChange}
      apiKey={apiKey}
      className={className}
      hint={hint}
      loadingLabel={loadingLabel}
      errorLabel={errorLabel}
    />
  );
}
