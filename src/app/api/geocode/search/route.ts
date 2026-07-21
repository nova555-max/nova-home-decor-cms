import { NextResponse } from "next/server";

import { checkRateLimit, getClientKey } from "@/lib/ai/rate-limit";
import { parseNominatimAddress } from "@/lib/office-location";
import { getAdminContext } from "@/lib/supabase/auth";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

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
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const url = new URL(NOMINATIM_SEARCH);
    url.searchParams.set("format", "json");
    url.searchParams.set("q", query);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "NovaHomeDecorCMS/1.0 (office location search)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: 502 });
    }

    const data = (await response.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string>;
    }>;

    const results = data.map((item) => {
      const lat = Number.parseFloat(item.lat ?? "");
      const lng = Number.parseFloat(item.lon ?? "");
      const geocoded = parseNominatimAddress(
        item.display_name ?? "",
        item.address,
      );
      return {
        ...geocoded,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
