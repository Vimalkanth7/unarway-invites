import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { resolveTemplateViewPath } from "@/lib/templates/loader";

// Served into a sandbox="allow-scripts" iframe (no allow-same-origin), so the
// template runs with an opaque origin and can't reach the parent page's DOM,
// storage, or cookies. This CSP is a second layer on top of that sandboxing.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'none'",
  "frame-src 'none'",
].join("; ");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ designId: string }> }
) {
  const { designId } = await params;
  const filePath = resolveTemplateViewPath(designId);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  try {
    const html = await fs.readFile(filePath, "utf8");
    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": CSP,
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
