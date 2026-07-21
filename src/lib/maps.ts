import {
  buildGoogleMapsNavigationUrl,
  buildGoogleMapsEmbedUrl,
  resolveDirectionsUrl,
  DEFAULT_MAP_CENTER,
} from "@/lib/office-location";

type MapLinkSource = {
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  company_address?: string | null;
};

/** URL for opening the office location in Google Maps (navigation). */
export function googleMapsLink(
  source: MapLinkSource | null | undefined,
): string | null {
  if (!source) return null;

  if (source.latitude != null && source.longitude != null) {
    return buildGoogleMapsNavigationUrl(source.latitude, source.longitude);
  }

  const raw = source.google_maps_url?.trim();
  if (raw) {
    return raw.replace(/([?&])output=embed(&|$)/, "$1").replace(/[?&]$/, "");
  }

  if (source.company_address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(source.company_address.trim())}`;
  }

  return null;
}

export {
  buildGoogleMapsNavigationUrl,
  DEFAULT_MAP_CENTER,
  buildGoogleMapsEmbedUrl,
  resolveDirectionsUrl,
};
export { buildGoogleMapsUrl } from "@/lib/office-location";
