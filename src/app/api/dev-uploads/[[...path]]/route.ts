import { NextResponse } from "next/server";

import {
  isLocalDevStorage,
  mimeFromPath,
  readLocalUpload,
} from "@/lib/dev/local-uploads";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isLocalDevStorage()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const relativePath = segments.join("/");
  const file = await readLocalUpload(relativePath);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": mimeFromPath(relativePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
