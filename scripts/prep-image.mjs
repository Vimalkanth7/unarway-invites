#!/usr/bin/env node
// Prepares a source photo/painting for use as template background art.
// Run via `npm run prep:image -- <input> <output.webp> [--cutout]`.
//
// Default mode: resize to 1620px wide, extend vertically to a tall 0.42
// (width:height) aspect using the image's own mirrored, blurred edges (the
// technique templates/christian-garden/reference documented by hand --
// this scripts it), light sharpen, WebP out. Matches the "extend artwork
// vertically with its own mirrored or blurred edges" rule in CLAUDE.md's
// Template gotchas.
//
// --cutout mode: for a white-background painting meant to sit as an accent
// over a template's own background, not fill the frame. Resizes, keys
// near-white pixels to transparent (a simple per-pixel threshold -- not
// ML background removal), trims to content, light sharpen, transparent
// WebP out. No vertical extension (cutouts aren't meant to be stretched
// tall).
//
// AI upscaling is NOT implemented here -- if a source image is already
// smaller than the 1620px target, this script warns and resizes up with
// a plain (blurrier) resize rather than silently pretending to upscale
// well. Upscale the source yourself first if that matters for this image.
import sharp from "sharp";
import path from "node:path";

const TARGET_WIDTH = 1620;
const TARGET_ASPECT = 0.42; // width / height
const TARGET_HEIGHT = Math.round(TARGET_WIDTH / TARGET_ASPECT);
const EDGE_BLUR_SIGMA = 24;
const SHARPEN_SIGMA = 0.6;
const WEBP_QUALITY = 82;
const WHITE_THRESHOLD = 243; // 0-255; a pixel with every channel >= this is treated as background
const WHITE_FEATHER = 18; // soft-alpha band below the threshold, for a non-jagged cutout edge

function usageError(message) {
  console.error(`✗ ${message}`);
  console.error("\nUsage: npm run prep:image -- <input> <output.webp> [--cutout]");
  process.exit(1);
}

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const cutout = args.includes("--cutout");
const [input, output] = positional;

if (!input) usageError("missing <input>");
if (!output) usageError("missing <output.webp>");
if (path.extname(output).toLowerCase() !== ".webp") usageError("<output> must end in .webp");

async function extendVertically(resized, width, height) {
  if (height >= TARGET_HEIGHT) {
    // Already tall enough (or taller) once resized to the target width --
    // center-crop down to the target height instead of extending.
    const top = Math.floor((height - TARGET_HEIGHT) / 2);
    return resized.extract({ left: 0, top, width, height: TARGET_HEIGHT });
  }

  const extPx = Math.ceil((TARGET_HEIGHT - height) / 2);
  const capSourceHeight = Math.min(extPx, height);

  const buf = await resized.clone().toBuffer();

  async function makeCap(fromTop) {
    const extractTop = fromTop ? 0 : height - capSourceHeight;
    let cap = sharp(buf)
      .extract({ left: 0, top: extractTop, width, height: capSourceHeight })
      .flip() // mirror top-to-bottom, so the cap's outer edge matches what it's extending
      .blur(EDGE_BLUR_SIGMA);
    if (capSourceHeight !== extPx) {
      // Degenerate case: needed extension is taller than the whole source
      // image. Stretch the mirrored strip rather than tiling it -- a soft
      // blur hides the stretch; this is a rare fallback, not the common path.
      cap = cap.resize(width, extPx, { fit: "fill" });
    }
    return cap.toBuffer();
  }

  const [topCap, bottomCap, mainBuf] = await Promise.all([
    makeCap(true),
    makeCap(false),
    resized.clone().toBuffer(),
  ]);

  return sharp({
    create: { width, height: TARGET_HEIGHT, channels: 3, background: "#000000" },
  }).composite([
    { input: topCap, left: 0, top: 0 },
    { input: mainBuf, left: 0, top: extPx },
    { input: bottomCap, left: 0, top: extPx + height },
  ]);
}

async function keyWhiteToTransparent(image, width, height) {
  const raw = await image.ensureAlpha().raw().toBuffer();
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const minChannel = Math.min(r, g, b);
    if (minChannel >= WHITE_THRESHOLD) {
      raw[i + 3] = 0;
    } else if (minChannel >= WHITE_THRESHOLD - WHITE_FEATHER) {
      // Soft edge: fade alpha over the feather band instead of a hard cutoff.
      const t = (minChannel - (WHITE_THRESHOLD - WHITE_FEATHER)) / WHITE_FEATHER;
      raw[i + 3] = Math.round(raw[i + 3] * (1 - t));
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } });
}

async function main() {
  const source = sharp(input);
  const meta = await source.metadata();
  if (!meta.width || !meta.height) usageError(`could not read image dimensions from ${input}`);

  if (meta.width < TARGET_WIDTH) {
    console.warn(
      `⚠ ${input} is ${meta.width}px wide, smaller than the ${TARGET_WIDTH}px target. ` +
        `This script doesn't do AI upscaling -- resizing up anyway, but it may look soft. ` +
        `Upscale the source yourself first if that matters for this image.`
    );
  }

  // sharp's .metadata() on a pipeline with a pending (not-yet-executed)
  // resize() reports the ORIGINAL dimensions, not the resize's result --
  // only materializing the pipeline (toBuffer()) actually runs it. Resize
  // to a concrete buffer first, then build every downstream step from
  // that buffer's own (correct) metadata, instead of trusting metadata()
  // on a still-pending pipeline.
  const resizedBuf = await source.resize(TARGET_WIDTH, null, { fit: "inside" }).toBuffer();
  const resized = sharp(resizedBuf);
  const resizedMeta = await resized.metadata();
  const width = resizedMeta.width;
  const height = resizedMeta.height;

  let pipeline;
  if (cutout) {
    const keyed = await keyWhiteToTransparent(resized, width, height);
    pipeline = keyed.trim().sharpen(SHARPEN_SIGMA);
  } else {
    const extended = await extendVertically(resized, width, height);
    pipeline = extended.sharpen(SHARPEN_SIGMA);
  }

  await pipeline.webp({ quality: WEBP_QUALITY }).toFile(output);
  console.log(`✓ wrote ${output}`);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
