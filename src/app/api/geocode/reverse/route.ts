import { NextResponse } from "next/server";

import { checkRateLimit, getClientKey } from "@/lib/ai/rate-limit";
import { parseNominatimAddress } from "@/lib/office-location";
import { getAdminContext } from "@/lib/supabase/auth";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`geocode:${getClientKey(request)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: limit.retryAfterMs
          ? { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) }
          : undefined,
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM_REVERSE);
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NovaHomeDecorCMS/1.0 (office location manager)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };

    const parsed = parseNominatimAddress(
      data.display_name ?? "",
      data.address,
    );

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
