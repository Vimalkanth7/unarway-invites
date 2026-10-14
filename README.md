# Unarway Invitations

Invitation website by Unarway: free browse/edit/preview, paid download.
Categories: Marriage, Reception, Birthday, Other. Tamil and English, mobile-first.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres/Auth/Storage),
Razorpay, deployed on Vercel.

See `CLAUDE.md` for the full rules (payment trust boundary, secrets, assets,
code style) that apply to every change in this repo.

## Status

Phase 0 — planning only, no app code yet. See "Phased plan" below.

## Planned folder structure

```
unarway-invitation-company/
├── CLAUDE.md
├── README.md
├── ASSETS.md                          # created once the first asset is added:
│                                       # every image/video/font/music + source + licence
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── reference/                         # read-only reference design (git-ignored)
│   └── temple-journey/
├── public/                            # static, non-template assets (favicon, default og image)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                           # home
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── refund-policy/page.tsx
│   │   ├── category/[category]/page.tsx       # marriage | reception | birthday | other
│   │   ├── design/[designId]/page.tsx          # live preview + edit panel
│   │   ├── checkout/[designId]/page.tsx
│   │   ├── i/[shortId]/page.tsx                # hosted paid invitation link
│   │   ├── my-invitations/page.tsx
│   │   ├── login/page.tsx
│   │   └── api/
│   │       ├── designs/[designId]/route.ts         # resolve meta/schema/defaults
│   │       ├── invitations/route.ts                # create/save draft (auth'd)
│   │       ├── invitations/[id]/route.ts
│   │       ├── checkout/create-order/route.ts      # Razorpay order
│   │       ├── checkout/webhook/route.ts           # Razorpay webhook, server-verified
│   │       └── download/[id]/route.ts              # gated ZIP; re-checks payment server-side
│   ├── components/
│   │   ├── editor/                     # schema-driven field editor (generic, not per-design)
│   │   ├── preview/                    # sandboxed iframe wrapper + postMessage bridge
│   │   ├── layout/                     # header, footer, nav
│   │   └── ui/                         # buttons, inputs, etc.
│   ├── lib/
│   │   ├── supabase/                   # server + browser clients
│   │   ├── razorpay/                   # order creation + webhook signature verification
│   │   ├── templates/                  # loads meta.json/schema.json/defaults.json
│   │   └── zip/                        # builds the clean downloadable ZIP server-side
│   └── types/
│       └── template.ts                 # TemplateMeta, FieldSchema, DesignConfig types
├── templates/
│   ├── temple-journey/                 # Design 1 — port of the reference
│   │   ├── meta.json
│   │   ├── schema.json
│   │   ├── defaults.json
│   │   ├── template/
│   │   └── assets/
│   ├── <marriage-design-2>/            # same shape
│   └── <birthday-design-3>/            # same shape
└── supabase/
    └── migrations/                     # users, invitations, orders, etc.
```

## Phased plan

- [ ] **Phase 0 — Planning** (this phase): read reference, write CLAUDE.md/README.md,
      propose phased plan, list open questions. No app code.
- [ ] **Phase 1 — Shell website**: Next.js + Tailwind scaffold, base layout/nav/footer,
      Supabase env wiring, static skeletons for home/category/legal pages.
- [ ] **Phase 2 — Template engine**: `TemplateMeta`/`FieldSchema`/`DesignConfig` types,
      loader for `templates/<id>/{meta,schema,defaults}.json`, generic schema-driven
      edit panel, sandboxed-iframe preview contract (postMessage protocol).
- [ ] **Phase 3 — Port design 1 (Temple Journey)**: move the reference into
      `templates/temple-journey/`, strip its built-in editor/localStorage/download,
      derive `schema.json` from `inv-fields` and `defaults.json` from `inv-config`.
- [ ] **Phase 4 — Edit panel end-to-end**: design page wires generic editor + live
      iframe preview together, debounced updates, watermark overlay on free preview.
- [ ] **Phase 5 — Login and save**: Supabase Auth, DB schema (users, invitations),
      save/update draft API routes, "My invitations" page, short-id generation for
      `/i/<short-id>` (locked until paid).
- [ ] **Phase 6 — Razorpay test mode + download gating**: create-order route,
      checkout page, webhook route that verifies signatures server-side, download
      route that re-checks paid status before streaming a ZIP, unlock `/i/<short-id>`.
- [ ] **Phase 7 — Designs 2 and 3**: a new Marriage design and a new Birthday design
      built on the proven template engine; every asset logged in `ASSETS.md`.
- [ ] **Phase 8 — Legal pages + deploy**: real About/Contact/Terms/Privacy/Refund
      content, production Supabase project, Vercel env vars, Razorpay live keys
      (still server-gated), full paid-flow smoke test.

## Local setup

Not yet applicable — Phase 1 will add `package.json`, `.env.example`, and setup steps.
