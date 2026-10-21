# Building a template

This is the authoring guide for building a new design on top of
`scripts/template-kit/`. If you haven't read `CLAUDE.md` yet, read that
first -- this file assumes its "Non-negotiable rules" and "Template
gotchas" as background and doesn't repeat them except where a rule needs a
template-author's-eye-view explanation.

## Quick start

```
npm run new:template -- <id> --category <marriage|reception|birthday|other>
npx next dev -p 3100            # your own dev server stays on 3000
# open http://localhost:3100/design/<id>
npm run check:templates
npm run qa:template -- <id> --port 3100
```

`<id>` becomes the folder name (`templates/<id>/`) and the URL segment --
lowercase letters, digits, and hyphens only. `new:template` refuses to
overwrite an existing folder.

A freshly scaffolded design is **not done**. It's 7 generic beats with CSS
gradients instead of photography, a placeholder quote line, and dummy data.
`templates/<id>/README.md` (written by the scaffold) has the exact TODO
list. `check:templates` will pass immediately; `qa:template` won't, until
real assets exist -- see "What a fresh scaffold is expected to fail" below.

## The engine contract

Every template -- scaffolded or hand-built -- is a single static
`template/index.html` that:

1. Posts `{ type: "unarway:ready" }` to `window.parent` once mounted.
2. Listens for `{ type: "unarway:config", payload }` and re-renders live,
   with no reload, every time the parent sends one (which happens on every
   keystroke in the editor panel).
3. Never touches `localStorage`, `sessionStorage`, `document.cookie`,
   `fetch()`, or `XMLHttpRequest` -- the preview iframe is
   `sandbox="allow-scripts"` with an opaque origin and
   `connect-src 'none'`, so all of these are either unavailable or
   actively blocked. `check:templates` enforces this.
4. Opens any `wa.me` / `tel:` / Google Maps link by posting
   `{ type: "unarway:open", href }` instead of a real `<a target="_blank">`
   -- the sandbox has no `allow-popups`, so a real link click is silently
   swallowed. `src/components/preview/PreviewFrame.tsx` validates `href`
   against an allowlist (`src/lib/templates/link-allowlist.ts`) before
   opening it. **Never** work around this by adding `allow-same-origin` or
   `allow-popups` to the iframe -- that removes the isolation the sandbox
   exists for.

The rendering engine itself (interpolation, `sc-for`/`sc-if`, the
`DCLogic` base class, the postMessage wiring) is the same code,
reused verbatim, in every template this product ships. Don't reinvent it
per design.

### Why copy, not share

`scripts/template-kit/engine.html` is the canonical source. `new:template`
**copies** it into each new design rather than having designs reference
one shared file. This isn't a style preference -- `src/lib/zip/build.ts`
(the paid-download ZIP builder) only ever packages a template's own
`template/` + `assets/` folders, nothing from outside them. A shared
external reference would ship broken in the ZIP. The copied file carries a
version-stamp comment (`<!-- unarway-engine v1, copied <date> for <id> -->`)
so a future `git grep "unarway-engine v1"` finds every template still on an
old engine version, if the canonical copy is ever meaningfully improved.
Existing sold designs are not expected to pick up engine changes
retroactively.

## Beats, labels, snap

A design is a GSAP `ScrollTrigger`-pinned timeline with labels `b0`..`bN`
(N = the engine's `BEATS` constant, 6 by default -- 7 scenes). Each label
sits 10 timeline-units apart; `snap: { snapTo: 'labelsDirectional' }` means
any scroll, however small, settles on the nearest label. The "Please
scroll the screen" button on beat 0 does the same nudge a short swipe
would. Under `prefers-reduced-motion: reduce`, none of this runs -- the
`.anim` class is never added to `<html>`, and CSS falls back to plain
stacked `<section>`s (`html:not(.anim) .scene`).

**If you change the number of scenes**, update the `BEATS` constant in
`buildTimeline()` to match, and pass `--beats <N>` to `qa:template` (its
default of 6 only matches the kit's own default).

List fields (events, wishes, contacts, anything editable with "add
item"/"remove item" in the schema) are rendered **imperatively**, not with
`sc-for` -- `update()` only patches bindings recorded at mount, so a list
whose item *count* changes needs a real DOM rebuild, and GSAP resolves a
tween's target selector once, at construction time. `listFieldDefs()` in
the Component class is the shared orchestration (memoize unchanged
content, detect structural changes, debounce ~300ms, kill and rebuild the
ScrollTrigger timeline, return to the current beat via `labelToScroll`) --
add an entry there plus one `render(items)` function per new list field,
don't hand-roll the memoization/debounce wiring again.

## Theme tokens

Every colour a scaffolded design uses is a CSS custom property at the top
of `template/index.html` (`--ivory`, `--accent`, `--night`, etc.), each
marked `/* EDIT-ME */`. Change these first, before touching any other CSS
-- most of the stylesheet references them, not literal hex values. The
seven `--grad-N` gradients are stand-ins for real photography; replace a
scene's background with an `<img class="bg">` (see
`templates/christian-garden/template/index.html` for the pattern) once you
have real art, processed with `npm run prep:image`.

Fonts load from `fonts.googleapis.com` (already allowed by
`check-templates.mjs`'s external-host check) rather than being bundled --
change the `<link href="...fonts.googleapis.com/css2?family=...">` and the
`font-family` references together.

## Licensing

`meta.json`'s `"licensed"` field gates real visibility: `isTemplateVisible()`
(`src/lib/templates/loader.ts`) hides anything that isn't `licensed: true`
from `/design`, `/api/templates/*`, `/i`, and category listings -- in both
dev and production -- unless `ALLOW_UNLICENSED_TEMPLATES=1` is set. A fresh
scaffold is always `licensed: false`. Every asset you add (image, video,
font file, music) needs a row in `ASSETS.md` under that design's own
section with its source and licence before you flip `licensed` to `true`
-- `check:templates` hard-fails if `licensed: true` is set while an
UNLICENSED row still exists for that design, and warns on every run for
any design that isn't licensed yet.

No Pinterest images, no copyrighted music, ever -- see CLAUDE.md Working
rule 5.

## Elder-friendly rules (CLAUDE.md working rule 8, for template authors)

- **Snap-to-beat scrolling or a clear "scroll" button** -- both already
  exist in the kit engine; don't remove either.
- **Text at least 16px.** The kit's own CSS enforces this with
  `font-size:max(16px, Ncqw)` on every small-caption class, so it never
  silently shrinks below 16px on a narrow phone. **One documented
  exception**: the four countdown unit labels (Days/Hours/Min/Sec) use a
  14px floor, because four labels have to fit in one row in a ~390px
  frame -- the same compromise `malligai-mandapam` already made for the
  same reason. `qa:template` still flags this (correctly -- it's below the
  letter of the rule) so it stays a visible, judged exception, not a
  silent one. If you change this layout (e.g. fewer/wider columns), you
  can remove the 14px exception and go back to the 16px floor.
- **Contrast 4.5:1.** Enforced where the checker can actually measure it
  (text on a solid `background-color`, including every `.glass`/`.panel`
  scrim). See "What the QA script doesn't check" below for where it can't.
- **44px tap targets.** The gate button, cue button, and `.btn`/`.go`
  buttons are already sized for this; keep new interactive elements at
  `min-height: 44px` (or the `cqw` equivalent at typical phone widths).

## QA checklist -- `npm run qa:template -- <id>`

Does **not** start its own server (see CLAUDE.md's port discipline) --
start one yourself first (`npx next dev -p 3100` or `next start -p 3100`),
then point `qa:template` at it with `--port`. Uses `playwright-core` with
an `executablePath` pointing directly at an already-installed Chromium
under `%LOCALAPPDATA%\ms-playwright\` -- this never runs
`playwright install`; if no Chromium is cached there, the script fails
with a clear message rather than trying to fetch one.

What it checks, per template:
- Every beat (`b0..bN`), screenshotted at 390×844 (phone) and 1440×900
  (desktop) -- `qa-reports/<id>/<viewport>/beat-N.png`.
- A small-swipe test: scroll by 80px from beat 0, wait for the snap to
  settle, assert the landed position is within 4px of a beat boundary.
- Console errors and failed requests (404s etc.), separately per viewport.
- `prefers-reduced-motion: reduce`: confirms the `.anim` class is
  correctly never added, and that nothing errors in that mode.
- Contrast: computed `color` vs. the nearest ancestor's solid
  `background-color`, WCAG relative-luminance ratio, flags anything under
  4.5:1. Also flags any text under the 16px floor.
- The 3 MB budget (same byte-counting as `check:templates`, via
  `scripts/lib/fs-utils.mjs`).

Writes `qa-reports/<id>/report.json` and `.md` (git-ignored -- these are
local artifacts, not something to commit).

### What the QA script doesn't check

- **Text directly on a gradient or photo, with no solid scrim behind it.**
  The contrast checker can only measure a solid `background-color`; if the
  nearest non-transparent thing behind a text element is a
  `background-image` (a CSS gradient, or an `<img class="bg">` once you've
  added real photography), it reports that text as "contrast not
  verifiable" rather than guessing -- check those by eye against the beat
  screenshots. Prefer putting text over imagery inside a `.glass`/`.panel`
  scrim (an explicit `background-color`, not just a gradient) specifically
  so it becomes checkable, not just so it looks better.
- **AI upscaling of source images** -- not implemented in `prep:image`
  either; see that section below.
- **Real device behavior** -- music autoplay policy, WhatsApp's in-app
  browser, actual touch gestures. Playwright's swipe-test emulates a
  scroll event, not a real touch gesture; it's a reasonable proxy, not a
  replacement for testing on an actual phone before calling a design done.

### What a fresh scaffold is expected to fail

Running `qa:template` right after `new:template`, before you've added any
real assets, will report issues -- that's correct, not a tooling bug:
- A 404 for `assets/music.mp3` (the stub ships none; add one once you have
  it, or remove the `<audio>` element if this design has no music).
- The 8 flagged 14px countdown-label font sizes (see above -- a documented
  exception, not a defect in the script).

Both go away once the design is actually finished, or in the second case,
once you've judged it acceptable and moved on.

## Image prep -- `npm run prep:image -- <input> <output.webp> [--cutout]`

Default mode: resize to 1620px wide, extend vertically to a tall 0.42
(width:height) aspect using the image's own mirrored, blurred top/bottom
edges (not a hard crop, not a solid colour bar) -- so the same picture
fills the frame on both a short and a very tall phone screen. Finishes
with a light sharpen and WebP output. This is the exact technique
`christian-garden`'s source images already use by hand (confirmed: its own
`hero-arch.webp` is already precisely 1620×3857, aspect 0.420).

`--cutout` mode is for a white-background painting/illustration meant to
sit as an accent over the template's own background, not fill the frame:
keys near-white pixels to transparent (a simple per-pixel brightness
threshold with a soft feather band -- not ML background removal) and trims
to content. No vertical extension in this mode.

**No AI upscaling.** If a source image is narrower than 1620px, the script
warns and resizes up anyway with a plain (softer) resize rather than
pretending to upscale well -- upscale the source yourself first if that
matters for a specific image.

## Birthday (or other non-couple) designs

The generic scaffold schema is couple-shaped (`person1Name`/`person2Name`,
a `ceremonyDate`/`ceremonyVenue`). For a single-celebrant design, rework
these by hand in `schema.json`, `defaults.json`, and every
`{{person1}}`/`{{person2}}` binding in `template/index.html` into a
single-celebrant shape. The scaffold doesn't do this automatically --
Marriage and Reception designs share the couple shape, so generating it
once and reworking it by hand for the occasional non-couple design was a
better trade than building (and maintaining) category-aware schema
generation for a shape only Birthday/Other designs need. This is expected,
normal per-design customization, not a workaround for a missing feature.
