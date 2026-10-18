# Asset log

Every image, video, font, and music file used by a template, with its source
and licence, per the CLAUDE.md rule: no Pinterest images, no copyrighted
music, nothing ships without this record.

## Site-wide

| File | Used for | Status |
| --- | --- | --- |
| `src/app/icon.svg` | Browser tab / favicon for the whole site -- an 8-point kolam dot motif in gold on a near-black badge | Original artwork, made for this project. No licence needed. |
| `src/app/favicon.ico` | Legacy `/favicon.ico` fallback (16/32/48 px), rendered directly from `icon.svg` above | Same original artwork, re-rasterized. No licence needed. |

## templates/temple-journey/

Ported from `reference/temple-journey/` (a one-off personal invitation) as
placeholder media so the design has something to show. **None of it is
cleared for commercial use.** Every row below must be replaced with licensed
or custom-shot media before this design is sold to a real customer.

| File | Used for | Status |
| --- | --- | --- |
| `assets/2a818b411e.webp` | Pillar texture (corridor) | UNLICENSED - replace before launch |
| `assets/3f4ddccacd.webp` | Flower thoranam / finale frame | UNLICENSED - replace before launch |
| `assets/4e2b763272.webp` | Mandapam background | UNLICENSED - replace before launch |
| `assets/54d722b725.jpg` | Hero video poster frame | UNLICENSED - replace before launch |
| `assets/59d9b9856c.webp` | Pillar texture (corridor) | UNLICENSED - replace before launch |
| `assets/5c517b8490.mp4` | Hero video: Ganesha at the temple | UNLICENSED - replace before launch |
| `assets/79cea246a4.mp4` | Venue section video: temple corridor | UNLICENSED - replace before launch |
| `assets/85dabcbc89.jpg` | Venue video poster frame | UNLICENSED - replace before launch |
| `assets/couple.jpg` | Default/sample couple photo | UNLICENSED - replace before launch |
| `assets/d5fa5812bd.jpg` | Walk section background (reduced-motion fallback) | UNLICENSED - replace before launch |
| `assets/f01459d010.webp` | Gopuram backdrop | UNLICENSED - replace before launch |
| `assets/music.mp3` | Background music | UNLICENSED - replace before launch |

Not sample media, tracked separately because they're already properly
licensed open-source code/fonts, not placeholder content:

| File | Licence |
| --- | --- |
| `assets/js/gsap.min.js`, `assets/js/ScrollTrigger.min.js` | GSAP (GreenSock); verify current terms at gsap.com before shipping |
| `assets/js/three.min.js` | Three.js, MIT |
| Google Fonts: Gloock, Kavivanar, Manrope, Marcellus (loaded via `fonts.googleapis.com`, not bundled) | Google Fonts, OFL/Apache |

## templates/malligai-mandapam/

No stock photos, no downloaded audio -- everything visual is SVG/CSS/canvas/
Three.js built from scratch, and the background audio is synthesized at
runtime rather than a shipped file.

| File | Used for | Status |
| --- | --- | --- |
| `assets/couple-placeholder.svg` | Default couple-photo placeholder (shown until the couple uploads a real photo) | Original artwork, made for this project. No licence needed. |
| Background ambient drone | Scene 1 (gate tap unlocks it), mute button | Original: synthesized at runtime with the Web Audio API (oscillators + gain nodes, see `template/index.html`). Not a file -- nothing to license or replace before launch. |

Not sample media, tracked separately because they're already properly
licensed open-source code/fonts, not placeholder content:

| File | Licence |
| --- | --- |
| `assets/js/gsap.min.js`, `assets/js/ScrollTrigger.min.js` | GSAP (GreenSock); verify current terms at gsap.com before shipping |
| `assets/js/three.min.js` (loaded dynamically, only once the capability check passes) | Three.js, MIT |
| Google Fonts: Cormorant Garamond, Noto Serif Tamil, Manrope (loaded via `fonts.googleapis.com`, not bundled) | Google Fonts, SIL Open Font License 1.1 |

## templates/christian-garden/

Ported from `reference/christian-garden/` (a one-off client project, cloned
from a private repo for this port) as placeholder media so the design has
something to show. All personal data (real names, dates, phone numbers) was
replaced with invented placeholders before anything here was written -- see
`defaults.json`. **None of the media below is cleared for commercial use.**
Every row must be replaced with licensed or custom-shot media before this
design is sold to a real customer -- tracked in README.md's Launch checklist.

| File | Used for | Status |
| --- | --- | --- |
| `assets/aisle.webp` | Scene 3, the church aisle | UNLICENSED - client project asset, replace before sale |
| `assets/church.webp` | Scene 4, the schedule page watercolor | UNLICENSED - client project asset, replace before sale |
| `assets/hero-arch.webp` | Scene 1 background, welcome-screen default photo, and source of `assets/preview.jpg` | UNLICENSED - client project asset, replace before sale |
| `assets/rings.webp` | Scene 2, the rings | UNLICENSED - client project asset, replace before sale |
| `assets/swing.webp` | Scene 5, the garden swing | UNLICENSED - client project asset, replace before sale |
| `assets/music.mp3` | Background music, started on the welcome-screen tap | UNLICENSED - client project asset, replace before sale |
| `assets/preview.jpg` | `meta.previewImage` / social share fallback -- a cover crop of `hero-arch.webp`, no names or text added | Same status as `hero-arch.webp` above (it's a crop of that file) |

Scripture quotes (Psalm 128:1, Numbers 6:24, Psalm 126:3) are the King James
Version (KJV, 1611/1769 Authorized Version) — public domain in the US, used
word-for-word in `defaults.json`/`template/index.html`.

Not sample media, tracked separately because they're already properly
licensed open-source code/fonts, not placeholder content:

| File | Licence |
| --- | --- |
| `assets/js/gsap.min.js`, `assets/js/ScrollTrigger.min.js` | GSAP (GreenSock); verify current terms at gsap.com before shipping |
| `assets/fonts/CormorantGaramond-400.woff2`, `assets/fonts/CormorantGaramond-400i.woff2`, `assets/fonts/Jost-400.woff2`, `assets/fonts/PinyonScript-400.woff2` (self-hosted; each file's `font-weight: 400 700` range means it's a variable font covering both weights, so no separate 500-weight file is needed) | Google Fonts, SIL Open Font License 1.1 |

## templates/sample-card/

Dev fixture only (see README.md Phase 2 note); ships no bundled media — the
photo field is populated by the user at edit time.
