import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { resolveTemplateAssetPath } from "@/lib/templates/loader";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
};

/**
 * The preview iframe is sandbox="allow-scripts" (no allow-same-origin), so
 * it has an opaque origin -- the browser treats even same-host requests as
 * cross-origin. WebGL refuses to upload a texture (TextureLoader images, the
 * hero VideoTexture) from a cross-origin response unless it's explicitly
 * marked loadable cross-origin. This route only ever serves a template's own
 * bundled assets (never private Storage or user photos, which are separate
 * routes), so it's safe to mark everything here cross-origin-readable.
 */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "cross-origin-resource-policy": "cross-origin",
};

type RangeResult = { start: number; end: number } | "unsatisfiable" | null;

/**
 * Resolves a Range header against the file's actual size. Returns null for
 * "no range requested" *and* for a header malformed enough that RFC 7233
 * §3.1 allows ignoring it outright (serve the full file either way) --
 * distinct from "unsatisfiable", which must become a 416, not a silent 200.
 */
function resolveRange(rangeHeader: string | null, size: number): RangeResult {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return null;

  let start: number;
  let end: number;

  if (!startStr) {
    // "bytes=-500" means the last 500 bytes.
    const suffixLength = Number(endStr);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr ? Number(endStr) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  }

  if (start >= size || start > end) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ designId: string; path: string[] }> }
) {
  const { designId, path: segments } = await params;
  const filePath = resolveTemplateAssetPath(designId, segments);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // Range support matters here specifically for video: Safari requires it to
  // play <video> at all, and scrubbing/seeking relies on it everywhere.
  const range = resolveRange(request.headers.get("range"), stat.size);

  if (range === "unsatisfiable") {
    return new NextResponse(null, {
      status: 416,
      headers: { ...CORS_HEADERS, "content-range": `bytes */${stat.size}` },
    });
  }

  if (range) {
    const stream = Readable.toWeb(
      createReadStream(filePath, { start: range.start, end: range.end })
    ) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...CORS_HEADERS,
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
        "accept-ranges": "bytes",
        "content-range": `bytes ${range.start}-${range.end}/${stat.size}`,
        "content-length": String(range.end - range.start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      ...CORS_HEADERS,
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
      "accept-ranges": "bytes",
      "content-length": String(stat.size),
    },
  });
}
