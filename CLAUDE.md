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
3. **No Pinterest images, no copyrighted music.** Every asset used in a template
   (image, video, font, music) must be recorded in `ASSETS.md` with its source
   and licence before it ships.
4. **Keep code simple and typed.** Prefer explicit types over `any`. Don't add
   abstractions, config flags, or error handling for cases that can't happen.
   Explain non-obvious decisions briefly in code comments or commit messages,
   not in separate docs.
5. **Free vs paid boundary:** browsing, editing, and a watermarked preview are
   free. A clean ZIP download and the hosted `/i/<short-id>` link are paid-only.

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
  Check for a listener on 3000 first if unsure.
