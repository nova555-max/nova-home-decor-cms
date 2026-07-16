import type { GeocodedAddress } from "@/types/office-location";

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  state_district?: string;
  region?: string;
  country?: string;
};

export function parseNominatimAddress(
  displayName: string,
  address?: NominatimAddress,
): GeocodedAddress {
  const streetParts = [
    address?.house_number,
    address?.road ?? address?.pedestrian,
  ].filter(Boolean);

  return {
    address: displayName,
    country: address?.country ?? null,
    city:
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      null,
    district:
      address?.suburb ??
      address?.neighbourhood ??
      address?.quarter ??
      address?.state_district ??
      address?.state ??
      address?.region ??
      null,
    street: streetParts.length ? streetParts.join(" ") : null,
  };
}

export function buildGoogleMapsNavigationUrl(
  latitude: number,
  longitude: number,
): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export const DEFAULT_MAP_CENTER = { lat: 36.1911, lng: 44.0092 };

export function formatOfficePublicSubtitle(office: {
  city?: string | null;
  district?: string | null;
  country?: string | null;
}): string {
  return [office.city, office.district, office.country]
    .filter((part) => part?.trim())
    .join(", ");
}

export function validateOfficeLocation(input: {
  name: string;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  if (!input.name.trim()) {
    return "Office address name is required.";
  }
  if (input.latitude == null || input.longitude == null) {
    return "Select a location on the map.";
  }
  if (
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    return "Invalid map coordinates.";
  }
  return null;
}
