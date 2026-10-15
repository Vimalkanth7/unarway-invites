import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { COUPLE_PHOTOS_BUCKET, isStoragePhotoPath } from "@/lib/supabase/storage";
import type { DesignConfig, TemplateBundle } from "@/types/template";

const TEMPLATES_ROOT = path.join(process.cwd(), "templates");

const INV_CONFIG_SCRIPT_PATTERN = /<script id="inv-config" type="application\/json">[\s\S]*?<\/script>/;

/**
 * Templates seed `<script id="inv-config">` with sample values and overwrite
 * them via postMessage when running in our preview iframe (see
 * preview-protocol.ts). A downloaded file has no parent to postMessage from,
 * so the final config has to be baked into that same script tag directly --
 * at that point it's what the template reads on load, same as the seed data.
 */
function injectConfig(html: string, config: DesignConfig): string {
  if (!INV_CONFIG_SCRIPT_PATTERN.test(html)) {
    throw new Error("Template is missing the inv-config script tag");
  }
  const json = JSON.stringify(config).replace(/<\/script/gi, "<\\/script");
  return html.replace(INV_CONFIG_SCRIPT_PATTERN, `<script id="inv-config" type="application/json">${json}</script>`);
}

async function addDirectoryToZip(zip: JSZip, dir: string, zipPrefix: string): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const zipPath = `${zipPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, zipPath);
    } else {
      zip.file(zipPath, await fs.readFile(fullPath));
    }
  }
}

/**
 * Builds the clean (no watermark, no editor chrome) downloadable ZIP for a
 * paid invitation: the template's index.html with the invitation's current
 * config baked in, plus its static assets, plus any custom photo fetched
 * fresh from private Storage. Always reflects the latest edited config --
 * nothing here is a frozen snapshot from the moment of payment.
 */
export async function buildInvitationZip(
  bundle: Pick<TemplateBundle, "meta" | "schema">,
  config: DesignConfig
): Promise<Buffer> {
  const designDir = path.join(TEMPLATES_ROOT, bundle.meta.id);
  const html = await fs.readFile(path.join(designDir, "template", "index.html"), "utf8");

  const finalConfig: DesignConfig = { ...config };
  const customPhotos: { zipPath: string; data: Buffer }[] = [];
  const photoFields = bundle.schema.filter((field) => field.type === "photo");

  if (photoFields.length > 0) {
    const supabase = createSupabaseServiceRoleClient();
    for (const field of photoFields) {
      const value = config[field.key];
      if (!value || !isStoragePhotoPath(value)) continue;

      const { data, error } = await supabase.storage.from(COUPLE_PHOTOS_BUCKET).download(value);
      if (error || !data) throw error ?? new Error(`Could not download photo for ${field.key}`);

      const zipPath = `assets/${field.key}.jpg`;
      customPhotos.push({ zipPath, data: Buffer.from(await data.arrayBuffer()) });
      finalConfig[field.key] = zipPath;
    }
  }

  const zip = new JSZip();
  zip.file("index.html", injectConfig(html, finalConfig));
  await addDirectoryToZip(zip, path.join(designDir, "assets"), "assets");
  for (const { zipPath, data } of customPhotos) {
    zip.file(zipPath, data);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
