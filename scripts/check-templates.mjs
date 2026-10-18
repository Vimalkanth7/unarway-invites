#!/usr/bin/env node
// Validates every templates/<id>/ folder against the engine's contract.
// Run via `npm run check:templates`. Exits non-zero if anything fails.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEMPLATES_DIR = path.join(ROOT, "templates");
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_EXTERNAL_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

let failed = false;

function fail(designId, message) {
  failed = true;
  console.error(`✗ ${designId}: ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function collectFiles(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(collectFiles(full, rel));
    else files.push(rel);
  }
  return files;
}

/**
 * Strips comments so the forbidden-API scan below only catches real usages,
 * not documentation *about* avoiding them (several templates have exactly
 * that comment, e.g. "// No localStorage/cookies: ..."). The negative
 * lookbehind keeps "https://..." intact -- only a genuine line-comment "//"
 * (not preceded by ":") gets stripped.
 */
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
}

function usesDateType(schema) {
  return schema.some(
    (field) => field.type === "date" || (field.itemFields ?? []).some((item) => item.type === "date")
  );
}

const assetsMdPath = path.join(ROOT, "ASSETS.md");
const assetsMd = fs.existsSync(assetsMdPath) ? fs.readFileSync(assetsMdPath, "utf8") : "";

const designIds = fs
  .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const designId of designIds) {
  const dir = path.join(TEMPLATES_DIR, designId);
  const metaPath = path.join(dir, "meta.json");
  const schemaPath = path.join(dir, "schema.json");
  const defaultsPath = path.join(dir, "defaults.json");
  const viewPath = path.join(dir, "template", "index.html");

  if (!fs.existsSync(metaPath) || !fs.existsSync(schemaPath) || !fs.existsSync(defaultsPath)) {
    fail(designId, "missing meta.json, schema.json, or defaults.json");
    continue;
  }

  let meta, schema, defaults;
  try {
    meta = readJson(metaPath);
    schema = readJson(schemaPath);
    defaults = readJson(defaultsPath);
  } catch (err) {
    fail(designId, `invalid JSON: ${err.message}`);
    continue;
  }

  if (meta.id !== designId) fail(designId, `meta.json id "${meta.id}" does not match its folder name`);
  if (!meta.title) fail(designId, "meta.json is missing title");
  if (!meta.category) fail(designId, "meta.json is missing category");

  for (const field of schema) {
    if (!(field.key in defaults)) {
      fail(designId, `field "${field.key}" has no entry in defaults.json`);
      continue;
    }
    if (field.type === "list") {
      let items;
      try {
        items = JSON.parse(defaults[field.key] || "[]");
      } catch {
        items = null;
      }
      if (!Array.isArray(items)) fail(designId, `list field "${field.key}"'s default is not a JSON array string`);
    }
  }

  if (!fs.existsSync(viewPath)) {
    fail(designId, "missing template/index.html");
  } else {
    const html = fs.readFileSync(viewPath, "utf8");

    if (!html.includes("unarway:ready")) fail(designId, "never posts the unarway:ready message");
    if (!html.includes("unarway:config")) fail(designId, "never listens for the unarway:config message");
    if (!html.includes("window.parent.postMessage")) fail(designId, "doesn't postMessage to window.parent");

    const code = stripComments(html);
    if (/\blocalStorage\b/.test(code)) fail(designId, "uses localStorage -- unavailable in the sandboxed iframe's opaque origin");
    if (/\bsessionStorage\b/.test(code)) fail(designId, "uses sessionStorage -- unavailable in the sandboxed iframe's opaque origin");
    if (/document\.cookie/.test(code)) fail(designId, "reads or writes document.cookie");
    if (/\bfetch\s*\(/.test(code)) fail(designId, "calls fetch() -- blocked by the iframe's connect-src 'none' CSP");
    if (/\bXMLHttpRequest\b/.test(code)) fail(designId, "uses XMLHttpRequest -- blocked by the iframe's connect-src 'none' CSP");

    const externalHosts = new Set(
      [...html.matchAll(/(?:src|href)\s*=\s*["']https?:\/\/([^"'/]+)/gi)]
        .map((m) => m[1])
        .filter((host) => !ALLOWED_EXTERNAL_HOSTS.has(host))
    );
    if (externalHosts.size > 0) {
      fail(designId, `references external host(s) not covered by CSP: ${[...externalHosts].join(", ")}`);
    }

    if (usesDateType(schema) && !html.includes("+05:30")) {
      fail(designId, "has a date field but never applies the +05:30 (IST) offset");
    }
  }

  const assetsDir = path.join(dir, "assets");
  const shippedAssets = collectFiles(assetsDir).filter((file) => !file.startsWith("js/"));
  for (const assetFile of shippedAssets) {
    if (!assetsMd.includes(`assets/${assetFile}`)) {
      fail(designId, `assets/${assetFile} is not logged in ASSETS.md`);
    }
  }

  const totalBytes = dirSize(path.join(dir, "template")) + dirSize(assetsDir);
  if (totalBytes > MAX_BYTES) {
    fail(designId, `template + assets total ${(totalBytes / 1024 / 1024).toFixed(2)} MB, over the 3 MB budget`);
  } else {
    console.log(`✓ ${designId}: ${(totalBytes / 1024).toFixed(0)} KB`);
  }
}

if (failed) {
  console.error("\ncheck:templates failed.");
  process.exit(1);
}
console.log("\nAll templates pass.");
