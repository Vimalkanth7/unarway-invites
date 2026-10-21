#!/usr/bin/env node
// QA pass for a single template, against an already-running dev/prod server
// (this script does NOT start one -- see CLAUDE.md's port discipline: your
// own server stays on 3000, Claude's own tests use 3100, and nothing here
// should risk colliding with either). Run via:
//   npm run qa:template -- <id> [--port 3100] [--beats 7] [--base-url <url>]
//
// Uses playwright-core with an explicit executablePath pointing at an
// already-installed Chromium under %LOCALAPPDATA%\ms-playwright\ -- never
// triggers a browser download (no `playwright install`, ever).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { dirSize, MAX_TEMPLATE_BYTES } from "./lib/fs-utils.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEMPLATES_DIR = path.join(ROOT, "templates");
const REPORTS_DIR = path.join(ROOT, "qa-reports");
const VIEWPORTS = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1440x900", width: 1440, height: 900 },
];
const SNAP_SETTLE_MS = 2000; // ScrollTrigger's own snap config maxes out at 1.5s
const CONTRAST_MIN_RATIO = 4.5;

function usageError(message) {
  console.error(`✗ ${message}`);
  console.error("\nUsage: npm run qa:template -- <id> [--port 3100] [--beats 7] [--base-url <url>]");
  process.exit(1);
}

function flag(args, name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) usageError("missing <id>");
if (!fs.existsSync(path.join(TEMPLATES_DIR, id))) usageError(`templates/${id}/ does not exist`);

const port = flag(args, "port", "3100");
// Matches the kit engine's own BEATS constant (the highest label index,
// b0..b6 -- 7 scenes, 6 transitions -- not the scene count). If a design
// changes its own BEATS constant, pass --beats to match or this script's
// computed scroll positions will drift from where the real timeline snaps.
const beats = Number(flag(args, "beats", "6"));
const baseUrl = flag(args, "base-url", `http://localhost:${port}`);
const viewUrl = `${baseUrl}/api/templates/${id}/view`;

function findChromium() {
  const cacheDir = path.join(os.homedir(), "AppData", "Local", "ms-playwright");
  if (!fs.existsSync(cacheDir)) return null;
  // Prefer the newest-numbered cached revision.
  const candidates = fs
    .readdirSync(cacheDir)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const dir of candidates) {
    const exe = path.join(cacheDir, dir, "chrome-win64", "chrome.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return null;
}

const chromiumPath = findChromium();
if (!chromiumPath) {
  console.error(
    "✗ No cached Chromium found under %LOCALAPPDATA%\\ms-playwright\\. " +
      "This script deliberately never runs `playwright install` to fetch one -- " +
      "install a browser yourself first (outside this script) if none is cached."
  );
  process.exit(1);
}

// ---------- in-page contrast check: injected into the browser, not run in Node ----------
function relLuminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastCheckerSource() {
  function parseColor(str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  // Walks up for a solid background-color. If the first non-transparent
  // thing found is a background-IMAGE (a gradient, almost everything in
  // this kit's CSS) instead, there's no single colour to measure against --
  // report "unverifiable" rather than silently falling through to a wrong
  // guess (the bug this replaced: every gradient-backed scene was being
  // treated as plain white, producing contrast numbers that didn't mean
  // anything).
  function nearestBackground(el) {
    let node = el;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0.5) return { color: bg, unverifiable: false };
      if (style.backgroundImage && style.backgroundImage !== "none") return { color: null, unverifiable: true };
      node = node.parentElement;
    }
    return { color: { r: 255, g: 255, b: 255, a: 1 }, unverifiable: false };
  }
  const results = [];
  const nodes = document.querySelectorAll("#app p, #app h1, #app h2, #app h3, #app span, #app b, #app li, #gate *");
  nodes.forEach((el) => {
    const text = (el.textContent || "").trim();
    if (!text || el.children.length > 0) return; // leaf text nodes only
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.3) return;
    const fg = parseColor(style.color);
    if (!fg) return;
    const bg = nearestBackground(el);
    results.push({ text: text.slice(0, 40), fg, bg, fontSize: parseFloat(style.fontSize) });
  });
  return results;
}

async function run() {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: chromiumPath, headless: true });

  const report = {
    designId: id,
    checkedAt: new Date().toISOString(),
    viewUrl,
    budget: null,
    viewports: {},
    swipeTest: null,
    reducedMotion: null,
    contrastFailures: [],
    contrastUnverifiable: [],
    consoleErrors: [],
    failedRequests: [],
    ok: true,
  };

  // Clean start every run -- otherwise a stale beat-N.png from a previous
  // run with a different --beats value (or a design whose beat count
  // shrank) would sit there looking like current output.
  const outDir = path.join(REPORTS_DIR, id);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // ---------- budget ----------
  const totalBytes = dirSize(path.join(TEMPLATES_DIR, id, "template")) + dirSize(path.join(TEMPLATES_DIR, id, "assets"));
  report.budget = { bytes: totalBytes, maxBytes: MAX_TEMPLATE_BYTES, ok: totalBytes <= MAX_TEMPLATE_BYTES };
  if (!report.budget.ok) report.ok = false;

  try {
    for (const vp of VIEWPORTS) {
      const vpDir = path.join(outDir, vp.label);
      fs.mkdirSync(vpDir, { recursive: true });
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

      page.on("console", (msg) => {
        if (msg.type() === "error") report.consoleErrors.push({ viewport: vp.label, text: msg.text() });
      });
      page.on("response", (res) => {
        if (res.status() >= 400) report.failedRequests.push({ viewport: vp.label, url: res.url(), status: res.status() });
      });

      await page.goto(viewUrl, { waitUntil: "load" });
      await page.waitForTimeout(600); // fonts/gate settle

      const gateBtn = page.locator("#gate-open");
      if (await gateBtn.count()) {
        await gateBtn.click();
        await page.waitForTimeout(1200); // intro animation
      }

      const beatShots = [];
      for (let i = 0; i <= beats; i++) {
        const targetY = await page.evaluate(
          ({ i, beats }) => Math.round((i / beats) * (window.innerHeight * (beats + 1))),
          { i, beats }
        );
        await page.evaluate((y) => window.scrollTo(0, y), targetY);
        await page.waitForTimeout(900);
        const shotPath = path.join(vpDir, `beat-${i}.png`);
        await page.screenshot({ path: shotPath });
        beatShots.push(path.relative(ROOT, shotPath));
      }
      report.viewports[vp.label] = { beatShots };

      // ---------- contrast, once per viewport (cheap, catches viewport-specific font-size issues too) ----------
      const contrastResults = await page.evaluate(`(${contrastCheckerSource.toString()})()`);
      for (const r of contrastResults) {
        if (r.bg.unverifiable) {
          // Text sits on a background-image (gradient/photo), not a solid
          // colour -- can't compute a real ratio from computed styles alone
          // (would need to sample the actual rendered pixels). Flagged
          // separately so it doesn't silently pass OR silently fail on a
          // guess; check it by eye against the beat screenshots instead.
          report.contrastUnverifiable.push({ viewport: vp.label, text: r.text });
        } else {
          const ratioFg = relLuminance([r.fg.r, r.fg.g, r.fg.b]);
          const ratioBg = relLuminance([r.bg.color.r, r.bg.color.g, r.bg.color.b]);
          const lighter = Math.max(ratioFg, ratioBg);
          const darker = Math.min(ratioFg, ratioBg);
          const ratio = (lighter + 0.05) / (darker + 0.05);
          if (ratio < CONTRAST_MIN_RATIO) {
            report.contrastFailures.push({ viewport: vp.label, text: r.text, ratio: Number(ratio.toFixed(2)), fontSize: r.fontSize });
          }
        }
        if (r.fontSize < 16) {
          report.contrastFailures.push({ viewport: vp.label, text: r.text, issue: `font-size ${r.fontSize}px, under the 16px minimum`, ratio: null });
        }
      }

      // ---------- small-swipe test: only meaningful on one viewport, phone-width is the real-world case ----------
      if (vp.label === "390x844") {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollBy(0, 80));
        await page.waitForTimeout(SNAP_SETTLE_MS);
        const landedY = await page.evaluate(() => window.scrollY);
        const perBeat = await page.evaluate((beats) => (window.innerHeight * (beats + 1)) / beats, beats);
        const nearestBeat = Math.round(landedY / perBeat);
        const expectedY = Math.round(nearestBeat * perBeat);
        const drift = Math.abs(landedY - expectedY);
        report.swipeTest = { landedY, nearestBeat, expectedY, driftPx: drift, ok: drift <= 4 };
        if (!report.swipeTest.ok) report.ok = false;
      }

      await page.close();
    }

    // ---------- reduced motion ----------
    const rmPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await rmPage.emulateMedia({ reducedMotion: "reduce" });
    const rmErrors = [];
    rmPage.on("console", (msg) => { if (msg.type() === "error") rmErrors.push(msg.text()); });
    await rmPage.goto(viewUrl, { waitUntil: "load" });
    await rmPage.waitForTimeout(600);
    const gateBtn = rmPage.locator("#gate-open");
    if (await gateBtn.count()) await gateBtn.click();
    await rmPage.waitForTimeout(500);
    const hasAnimClass = await rmPage.evaluate(() => document.documentElement.classList.contains("anim"));
    const rmShotPath = path.join(outDir, "reduced-motion.png");
    await rmPage.screenshot({ path: rmShotPath, fullPage: true });
    report.reducedMotion = {
      animClassSkipped: !hasAnimClass,
      consoleErrors: rmErrors,
      screenshot: path.relative(ROOT, rmShotPath),
      ok: !hasAnimClass && rmErrors.length === 0,
    };
    if (!report.reducedMotion.ok) report.ok = false;
    await rmPage.close();
  } finally {
    await browser.close();
  }

  if (report.consoleErrors.length > 0) report.ok = false;
  if (report.failedRequests.length > 0) report.ok = false;
  if (report.contrastFailures.length > 0) report.ok = false;

  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "report.md"), renderMarkdown(report));

  console.log(report.ok ? `✓ ${id}: QA passed` : `✗ ${id}: QA found issues`);
  console.log(`  Report: qa-reports/${id}/report.md`);
  if (!report.ok) {
    if (!report.budget.ok) console.log(`  - budget: ${(report.budget.bytes / 1024 / 1024).toFixed(2)} MB, over 3 MB`);
    if (report.swipeTest && !report.swipeTest.ok) console.log(`  - swipe test: landed ${report.swipeTest.driftPx}px off the nearest beat`);
    if (report.consoleErrors.length) console.log(`  - ${report.consoleErrors.length} console error(s)`);
    if (report.failedRequests.length) console.log(`  - ${report.failedRequests.length} failed request(s) (404 etc.)`);
    if (report.contrastFailures.length) console.log(`  - ${report.contrastFailures.length} contrast/text-size issue(s)`);
    if (report.reducedMotion && !report.reducedMotion.ok) console.log(`  - reduced-motion check failed`);
  }
  process.exit(report.ok ? 0 : 1);
}

function renderMarkdown(r) {
  const lines = [
    `# QA report: ${r.designId}`,
    "",
    `Checked: ${r.checkedAt}`,
    `Source: ${r.viewUrl}`,
    "",
    `## Budget`,
    `${(r.budget.bytes / 1024).toFixed(0)} KB (limit ${(r.budget.maxBytes / 1024 / 1024).toFixed(0)} MB) -- ${r.budget.ok ? "OK" : "OVER"}`,
    "",
    `## Small-swipe test`,
    r.swipeTest
      ? `Landed ${r.swipeTest.driftPx}px from the nearest beat (beat ${r.swipeTest.nearestBeat}) -- ${r.swipeTest.ok ? "OK" : "FAILED"}`
      : "Not run",
    "",
    `## Reduced motion`,
    r.reducedMotion
      ? `.anim class correctly skipped: ${r.reducedMotion.animClassSkipped}; console errors: ${r.reducedMotion.consoleErrors.length} -- ${r.reducedMotion.ok ? "OK" : "FAILED"}`
      : "Not run",
    "",
    `## Console errors (${r.consoleErrors.length})`,
    ...r.consoleErrors.map((e) => `- [${e.viewport}] ${e.text}`),
    "",
    `## Failed requests (${r.failedRequests.length})`,
    ...r.failedRequests.map((e) => `- [${e.viewport}] ${e.status} ${e.url}`),
    "",
    `## Contrast / text-size issues (${r.contrastFailures.length})`,
    ...r.contrastFailures.map((c) => `- [${c.viewport}] "${c.text}"${c.ratio != null ? ` ratio ${c.ratio}:1` : ""}${c.issue ? ` -- ${c.issue}` : ""}`),
    "",
    `## Contrast not verifiable by this tool (${r.contrastUnverifiable.length})`,
    `Text sitting on a gradient/image background -- no single colour to measure, check these by eye against the beat screenshots below.`,
    ...r.contrastUnverifiable.map((c) => `- [${c.viewport}] "${c.text}"`),
    "",
    `## Screenshots`,
    ...Object.entries(r.viewports).flatMap(([vp, v]) => [`### ${vp}`, ...v.beatShots.map((s) => `- ${s}`)]),
  ];
  return lines.join("\n") + "\n";
}

run().catch((err) => {
  console.error(`✗ ${err.stack || err.message}`);
  process.exit(1);
});
