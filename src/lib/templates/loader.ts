import fs from "node:fs/promises";
import path from "node:path";
import type { DesignConfig, FieldSchema, TemplateBundle, TemplateMeta } from "@/types/template";

const TEMPLATES_ROOT = path.join(process.cwd(), "templates");

/** Design ids are also used as URL and filesystem path segments. */
export function isValidDesignId(designId: string): boolean {
  return /^[a-z0-9-]+$/.test(designId);
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function listTemplateIds(): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(TEMPLATES_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function loadTemplateBundle(designId: string): Promise<TemplateBundle | null> {
  if (!isValidDesignId(designId)) return null;
  const dir = path.join(TEMPLATES_ROOT, designId);
  try {
    const [meta, schema, defaults] = await Promise.all([
      readJson<TemplateMeta>(path.join(dir, "meta.json")),
      readJson<FieldSchema[]>(path.join(dir, "schema.json")),
      readJson<DesignConfig>(path.join(dir, "defaults.json")),
    ]);
    return { meta, schema, defaults };
  } catch {
    return null;
  }
}

/**
 * A design whose meta.licensed isn't exactly true ships at least one asset
 * still logged "UNLICENSED" in ASSETS.md -- not safe to show a real
 * customer. Hidden everywhere (listings, /design, /api/templates/*, /i),
 * in both dev and production, unless ALLOW_UNLICENSED_TEMPLATES=1 is set
 * (for locally reviewing an in-progress design's own placeholder media).
 * devOnly fixtures stay dev-only regardless of that override.
 */
export function isTemplateVisible(meta: TemplateMeta): boolean {
  if (process.env.NODE_ENV === "production" && meta.devOnly) return false;
  if (meta.licensed !== true && process.env.ALLOW_UNLICENSED_TEMPLATES !== "1") return false;
  return true;
}

export async function listTemplatesByCategory(category: string): Promise<TemplateBundle[]> {
  const ids = await listTemplateIds();
  const bundles = await Promise.all(ids.map((id) => loadTemplateBundle(id)));
  return bundles.filter(
    (bundle): bundle is TemplateBundle => bundle !== null && bundle.meta.category === category && isTemplateVisible(bundle.meta)
  );
}

/** Resolves templates/<designId>/template/index.html, or null if designId is invalid. */
export function resolveTemplateViewPath(designId: string): string | null {
  if (!isValidDesignId(designId)) return null;
  return path.join(TEMPLATES_ROOT, designId, "template", "index.html");
}

/**
 * Resolves a path under templates/<designId>/assets/, rejecting anything that
 * would escape that directory (e.g. ".." segments).
 */
export function resolveTemplateAssetPath(designId: string, segments: string[]): string | null {
  if (!isValidDesignId(designId)) return null;
  const dir = path.resolve(TEMPLATES_ROOT, designId, "assets");
  const resolved = path.resolve(dir, ...segments);
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) return null;
  return resolved;
}
