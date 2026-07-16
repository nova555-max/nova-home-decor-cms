"use client";

import L from "leaflet";
import { MapPin } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import { buildGoogleMapsUrl, DEFAULT_MAP_CENTER } from "@/lib/maps";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

import type { LocationMapValue } from "@/components/admin/location-map-picker";

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#C9A96E;border:3px solid #F5F5F2;transform:rotate(-45deg);box-shadow:0 4px 12px rgb(30 31 27 / 0.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function parseCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    );
    if (!response.ok) return "";
    const data = (await response.json()) as { address?: string };
    return data.address ?? "";
  } catch {
    return "";
  }
}

function MapEvents({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type OsmMapPickerProps = {
  value: LocationMapValue;
  onChange: (value: LocationMapValue) => void;
  className?: string;
  hint?: string;
};

export function OsmMapPicker({
  value,
  onChange,
  className,
  hint,
}: OsmMapPickerProps) {
  const position = useMemo(() => {
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
      if (!keepAddress) {
        const geocoded = await reverseGeocodeAddress(lat, lng);
        if (geocoded) address = geocoded;
      }

      onChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        company_address: address,
        google_maps_url: buildGoogleMapsUrl(lat, lng),
      });
    },
    [onChange, value.company_address],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative z-0 min-h-[360px] overflow-hidden rounded-2xl border border-border/60 shadow-sm [&_.leaflet-container]:z-0 [&_.leaflet-pane]:z-0">
        <MapContainer
          center={position}
          zoom={15}
          className="h-[360px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onPick={(lat, lng) => void applyCoordinates(lat, lng)} />
          <Marker
            position={position}
            draggable
            icon={markerIcon}
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as L.Marker;
                const latLng = marker.getLatLng();
                void applyCoordinates(latLng.lat, latLng.lng);
              },
            }}
          />
        </MapContainer>
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
