import fs from "node:fs/promises";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ designId: string; path: string[] }> }
) {
  const { designId, path: segments } = await params;
  const filePath = resolveTemplateAssetPath(designId, segments);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
