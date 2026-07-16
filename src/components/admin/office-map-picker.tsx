"use client";

import L from "leaflet";
import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { DEFAULT_MAP_CENTER } from "@/lib/office-location";
import { cn } from "@/lib/utils";
import type { GeocodedAddress } from "@/types/office-location";

import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#C9A96E;border:3px solid #F5F5F2;transform:rotate(-45deg);box-shadow:0 4px 12px rgb(30 31 27 / 0.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

type SearchResult = GeocodedAddress & {
  latitude: number;
  longitude: number;
};

export type OfficeMapValue = {
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
};

type OfficeMapPickerProps = {
  value: OfficeMapValue;
  onChange: (value: OfficeMapValue) => void;
  className?: string;
  hint?: string;
  searchPlaceholder?: string;
  searchingLabel?: string;
  noResultsLabel?: string;
};

function MapRecenter({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center.lat, center.lng, map, zoom]);

  return null;
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

async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const response = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
  );
  if (!response.ok) {
    throw new Error("Geocoding failed");
  }
  return (await response.json()) as GeocodedAddress;
}

async function searchPlaces(query: string): Promise<SearchResult[]> {
  const response = await fetch(
    `/api/geocode/search?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { results?: SearchResult[] };
  return (data.results ?? []).filter(
    (item) => item.latitude != null && item.longitude != null,
  ) as SearchResult[];
}

export function OfficeMapPicker({
  value,
  onChange,
  className,
  hint,
  searchPlaceholder = "Search for a place…",
  searchingLabel = "Searching…",
  noResultsLabel = "No places found.",
}: OfficeMapPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const position = useMemo(() => {
    if (value.latitude != null && value.longitude != null) {
      return { lat: value.latitude, lng: value.longitude };
    }
    return DEFAULT_MAP_CENTER;
  }, [value.latitude, value.longitude]);

  const applyCoordinates = useCallback(
    async (lat: number, lng: number, geocoded?: GeocodedAddress) => {
      setIsGeocoding(true);
      try {
        const address = geocoded ?? (await reverseGeocode(lat, lng));
        onChange({
          latitude: lat,
          longitude: lng,
          country: address.country,
          city: address.city,
          district: address.district,
          street: address.street,
        });
      } catch {
        onChange({
          latitude: lat,
          longitude: lng,
          country: value.country,
          city: value.city,
          district: value.district,
          street: value.street,
        });
      } finally {
        setIsGeocoding(false);
      }
    },
    [onChange, value.city, value.country, value.district, value.street],
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(() => {
      void searchPlaces(trimmed).then((items) => {
        setResults(items);
        setIsSearching(false);
        setShowResults(true);
      });
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-border/60 bg-background pr-10 pl-10 text-sm shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
          {isSearching ? (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {showResults && query.trim().length >= 2 ? (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-border/60 bg-card shadow-lg">
            {results.length === 0 && !isSearching ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {noResultsLabel}
              </p>
            ) : null}
            {results.map((result) => (
              <button
                key={`${result.latitude}-${result.longitude}-${result.address}`}
                type="button"
                className="block w-full border-b border-border/40 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-muted/50"
                onClick={() => {
                  setQuery(result.address);
                  setShowResults(false);
                  void applyCoordinates(
                    result.latitude,
                    result.longitude,
                    result,
                  );
                }}
              >
                <span className="line-clamp-2 text-foreground">
                  {result.address}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative z-0 min-h-[320px] overflow-hidden rounded-2xl border border-border/60 shadow-sm sm:min-h-[400px] [&_.leaflet-container]:z-0 [&_.leaflet-pane]:z-0">
        {isGeocoding ? (
          <div className="absolute top-3 right-3 z-[500] inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="size-3.5 animate-spin" />
            {searchingLabel}
          </div>
        ) : null}
        <MapContainer
          center={position}
          zoom={15}
          className="h-[320px] w-full sm:h-[400px]"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={position} />
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
