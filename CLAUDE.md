# Unarway Invitations — project context for Claude Code

## What this is
A website by Unarway that sells animated digital invitations. Visitors browse
designs by category (Marriage, Reception, Birthday, Other), edit the details and
preview for free, and pay only to download. Tamil and English text, mobile-first.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS
- Supabase: Postgres, Auth, Storage
- Razorpay for payment (test mode until Phase 6 is proven)
- Deploy target: Vercel

## Reference design
`reference/temple-journey/` is a finished reception invitation (excluded from git
via `.gitignore` — it is a nested repo, read-only, not shipped). Every design in
this product follows its pattern conceptually:

- a **config** (field values, e.g. `inv-config`)
- a **field schema** (editable fields, e.g. `inv-fields`)
- a **template** (the markup + runtime that renders config → invitation)
- an **asset folder** (images/video/fonts local to that design)

Do **not** reuse its built-in editor (the FAB + side panel) or its client-side
Blob download. Those are replaced by:
- a generic, schema-driven edit panel (built once, shared by every design)
- server-gated download, unlocked only after Razorpay payment is verified

## Template folder shape (per design)
```
templates/<design-id>/
  meta.json        # title, category, slug, price, etc.
  schema.json       # editable fields: key, label, type, section, hints
  defaults.json      # default field values
  template/          # the renderable template (markup/runtime)
  assets/            # images, video, fonts local to this design
```
The edit panel is generated from `schema.json`. The preview renders inside a
sandboxed iframe — the template never runs in the parent page's origin/context.

## Non-negotiable rules
1. **Never trust the browser for payment status.** The server verifies every
   Razorpay webhook signature and is the only source of truth for whether an
   invitation is paid. Download and the hosted `/i/<short-id>` link stay locked
   until the server confirms payment.
2. **Secrets never get committed.** All keys (Supabase, Razorpay, etc.) live in
   `.env` / `.env.local`. `.env*` is git-ignored. Never hardcode a key in source.
3. **Keep code simple and typed.** Prefer explicit types over `any`. Don't add
   abstractions, config flags, or error handling for cases that can't happen.
   Explain non-obvious decisions briefly in code comments or commit messages,
   not in separate docs.
4. **Free vs paid boundary:** browsing, editing, and a watermarked preview are
   free. A clean ZIP download and the hosted `/i/<short-id>` link are paid-only.

(Asset licensing was rule 3 here; it now lives as Working rule 5 below, worded
a little more completely -- kept in one place rather than two.)

## Repository layout (planned — see README.md for the full folder plan)
- `src/app/` — routes (pages + API routes)
- `src/components/` — generic UI: editor, preview iframe wrapper, layout
- `src/lib/` — Supabase clients, Razorpay helpers, template loader
- `templates/` — one folder per design, per the shape above
- `supabase/migrations/` — SQL schema
- `reference/` — read-only reference design, git-ignored

## Working agreements
- This file should stay in sync with actual rules/decisions as the project
  evolves — update it when a rule changes rather than letting it go stale.
- Phase-by-phase plan lives in README.md; update checkboxes there as phases land.
- The user's own `next dev` often runs on port 3000 while Claude works in the
  same checkout. For any of Claude's own verification: use port 3100
  (`next dev -p 3100` / `next start -p 3100`), and never run `next build`
  (or delete `.next`) while the user's dev server is active -- both write to
  the same `.next` folder and a build mid-session can corrupt its state.
  Check for a listener on 3000 first if unsure. (Also stated as Working rule 3
  below -- kept in full here since this is the more detailed version.)

## Working rules
1. One task at a time: brief, plan, STOP for my approval, build, my test, commit.
2. Start new work in plan mode. Never start the next phase or design without my "go".
3. I run npm run dev on port 3000. Your tests use port 3100 and never run
   `next build` against `.next` while my dev server runs (full detail above
   under Working agreements).
4. Never open any .env file. I add secrets myself.
5. Assets: original or licensed only. Pinterest and web images are mood
   references and never ship. Log every asset and licence in ASSETS.md.
6. Payment and unlock decisions happen on the server only (mechanism and
   locked surfaces: Non-negotiable rule 1 above).
7. Say plainly what you could not verify (no real browser or phone) and give
   exact test steps.
8. Older guests scroll very little: every template needs snap-to-beat
   scrolling or a clear "scroll" button, text of at least 16px, contrast
   4.5:1 and 44px tap targets.
9. Initial page load under 3 MB, tested with 6x CPU and slow 4G.
10. End every step with: what changed, how to test, what is still pending.

## Template gotchas
- GSAP: never let a scroll tween and an intro tween animate the same property
  of the same element. Use wrapper elements.
- mix-blend-mode: multiply breaks under transformed or faded ancestors. Use
  real transparency.
- Avoid filter: blur, drop-shadow and heavy backdrop-filter on animated
  elements.
- Tall phones: extend artwork vertically with its own mirrored or blurred
  edges, not just object-fit: cover.
- font-variant-numeric: lining-nums (tabular-nums for countdowns). Self-host
  fonts as woff2.
- Pinned scenes: ScrollTrigger.config({ ignoreMobileResize: true }), refresh
  after fonts and load.
- Test small swipes: one nudge must land exactly on beat N.
- Template-relative asset paths must be resolved before use in the parent page.
- A timeline built from a list must be rebuilt only when the list's structure
  changes.
- Links and calls from a sandboxed template go through the parent allowlist
  (unarway:open).
