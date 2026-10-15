# Unarway Invitations

Invitation website by Unarway: free browse/edit/preview, paid download.
Categories: Marriage, Reception, Birthday, Other. Tamil and English, mobile-first.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres/Auth/Storage),
Razorpay, deployed on Vercel.

See `CLAUDE.md` for the full rules (payment trust boundary, secrets, assets,
code style) that apply to every change in this repo.

## Status

Phase 6 done, test mode — Razorpay order creation, signature-verified
checkout, an idempotent webhook, gated ZIP downloads, and the `/i/<short-id>`
hosted page are live. See "Phased plan" below, and the Launch checklist
before selling any design.

## Planned folder structure

```
unarway-invitation-company/
├── CLAUDE.md
├── README.md
├── ASSETS.md                          # every image/video/font/music used by a
│                                       # template, its source, and its licence
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

- [x] **Phase 0 — Planning** (this phase): read reference, write CLAUDE.md/README.md,
      propose phased plan, list open questions. No app code.
- [x] **Phase 1 — Shell website**: Next.js + Tailwind scaffold, base layout/nav/footer,
      Supabase env wiring, static skeletons for home/category/legal pages.
- [x] **Phase 2 — Template engine**: `TemplateMeta`/`FieldSchema`/`DesignConfig` types,
      loader for `templates/<id>/{meta,schema,defaults}.json`, generic schema-driven
      edit panel, sandboxed-iframe preview contract (postMessage protocol).
- [x] **Phase 3 — Port design 1 (Temple Journey)**: moved the reference into
      `templates/temple-journey/`, stripped its built-in editor/localStorage/download,
      derived `schema.json` from `inv-fields` and `defaults.json` from `inv-config`.
      All sample media (images, video, music) are unlicensed placeholders — see
      `ASSETS.md` and the Launch checklist.
- [ ] **Phase 4 — Edit panel end-to-end**: design page wires generic editor + live
      iframe preview together, debounced updates, watermark overlay on free preview.
- [x] **Phase 5 — Login and save**: Supabase email magic-link auth, `invitations`
      table with RLS, private `couple-photos` Storage bucket, autosaving drafts
      from the design page (browser client, no server API routes needed — RLS
      does the gating), "My invitations" page (list/open/rename/delete),
      short-id generated at creation (no public `/i/<short-id>` route yet).
- [x] **Phase 6 — Razorpay test mode + publish gating**: `src/lib/payments/razorpay.ts`
      (Orders API + signature checks, the one module to swap for another gateway),
      `create-order`/`verify` routes plus an idempotent webhook, and `/i/<short-id>`
      serving only paid, non-expired invitations without a watermark, with per-invitation
      Open Graph/Twitter metadata. The hosted link is the deliverable: paying surfaces a
      copy/WhatsApp/QR share panel (`PublishedShare`), not a file. The ZIP
      (`src/lib/zip/build.ts`) still works end to end but stays hidden in the UI behind
      `siteConfig.enableZipDownload` (default `false`). Re-publishing after further edits
      and re-sharing both work -- nothing is a frozen snapshot from the moment of payment.
      Still TEST MODE; see "Testing payments" below before this goes anywhere near a real
      customer.
- [ ] **Phase 7 — Designs 2 and 3**: a new Marriage design and a new Birthday design
      built on the proven template engine; every asset logged in `ASSETS.md`.
- [ ] **Phase 8 — Legal pages + deploy**: real About/Contact/Terms/Privacy/Refund
      content, production Supabase project, Vercel env vars, Razorpay live keys
      (still server-gated), full paid-flow smoke test.

## Launch checklist

Blocking — none of these may be skipped before a design is sold to a real
customer (test/dev use is fine without them):

- [ ] Every file marked "UNLICENSED - replace before launch" in `ASSETS.md`
      is replaced with licensed or custom-shot media, and `ASSETS.md` is
      updated with the replacement's source and licence.
- [ ] Custom SMTP is configured in Supabase (Authentication → Settings → SMTP
      Settings). The free built-in email sender doesn't allow editing auth
      email templates and caps sending at roughly 2 emails/hour per project --
      fine for dev, not for real signups. Once custom SMTP is set up, the
      Magic Link template can also be customized if needed.
- [ ] `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are swapped from `rzp_test_...`
      to live keys, and `RAZORPAY_WEBHOOK_SECRET` is set from a webhook
      actually configured in the Razorpay dashboard (see "Testing payments").
      Until the webhook secret is set, `/api/razorpay/webhook` safely rejects
      every call with 503 instead of accepting anything unverified -- the
      verify-after-checkout route is what actually marks payments paid in the
      meantime, the webhook is the belt-and-suspenders backstop for when a
      browser never gets to call it (closed tab, crashed network).

## Local setup

```
npm install
cp .env.example .env.local   # fill in Supabase keys once you have a project
npm run dev
```

Then open http://localhost:3000. Browsing, editing, and previewing designs
works without any env vars filled in; Supabase/Razorpay keys are only needed
once auth and payment land (Phase 5 onward).

### Debugging a draft that won't save

The design page's "Saved" indicator only shows once a write round-trips
through Supabase and a row actually comes back -- if a save fails, it shows
"Couldn't save" plus the Supabase error code and message right there, and
logs the full error object to the browser console (message/code/details
only; it never contains a token or key). Start there:

- Browser console: the logged error's `code` usually points straight at the
  cause -- an RLS violation, a not-null violation, or `session_mismatch`
  (the error we throw ourselves when the browser client's session doesn't
  match the signed-in user the page rendered for).
- Supabase dashboard → **Table Editor** → `invitations`: this bypasses RLS,
  so it's the source of truth for whether a row actually exists.
- Supabase dashboard → **Logs** → **Postgres Logs** / **API Logs**: shows
  the actual `INSERT`/`UPDATE` statements PostgREST ran and any database
  error raised.
- Browser DevTools → **Network** tab: inspect the `POST`/`PATCH` request to
  `.../rest/v1/invitations` directly -- status code and response body show
  exactly what Supabase sent back.

## Testing payments (Razorpay test mode)

### 1. Apply the Phase 6 migrations

In the Supabase dashboard → **SQL Editor**, run these in order (copy-paste
each file's contents, click Run):

1. `supabase/migrations/0003_orders.sql`
2. `supabase/migrations/0004_invitations_paid_at.sql`
3. `supabase/migrations/0005_storage_invitation_downloads.sql`

### 2. Confirm your keys are test-mode keys

`RAZORPAY_KEY_ID` should start with `rzp_test_` and `RAZORPAY_KEY_SECRET`
should be its matching test secret, both from the Razorpay dashboard's
**Test Mode** (toggle top-right) → **Settings → API Keys**. Don't open
`.env.local` to check this with a file viewer if you're ever unsure which
mode a key is in -- the `rzp_test_`/`rzp_live_` prefix is the tell, visible
wherever the key is displayed (Razorpay dashboard, a `console.log` of
`order.keyId` in the browser devtools during checkout, etc).

### 3. Run the flow end-to-end

1. `npm run dev`, sign in, open any design (e.g. `/design/temple-journey`),
   edit something so a draft autosaves.
2. Click **Pay &#8377;599 to publish** (or whatever the design's price is).
   The Razorpay Checkout overlay opens.
3. Pay with a **test card**: card number `4111 1111 1111 1111`, any future
   expiry, any 3-digit CVV, any name. Or switch to **UPI** in the overlay and
   enter the VPA `success@razorpay` to simulate a successful payment (use
   `failure@razorpay` to simulate a decline and check the "failed" state).
4. On success, the Pay button is replaced by the **Published** panel: the
   hosted link, a **Copy** button, **Share on WhatsApp** (opens
   `wa.me` with the link prefilled), a QR code with a **Download QR (PNG)**
   link, and "Live until <date>" (12 months out, `siteConfig.hostedLinkExpiryMonths`).
   Confirm Copy actually puts the link on your clipboard, and that the QR
   code scans to the same link.
5. Open the hosted link in an incognito window (no session) -- it should
   render the same invitation, watermark-free, without signing in.
6. Paste the hosted link into Slack/WhatsApp/a link-preview debugger (e.g.
   Facebook's Sharing Debugger or Twitter's Card Validator) and confirm the
   preview shows a title built from the design's configured name fields
   (e.g. "`<groom>` weds `<bride>`" for Temple Journey), a date/venue
   description, and an image -- the couple's uploaded photo if they set one,
   otherwise the design's `previewImage`.
7. In Supabase → Table Editor: `orders` should have one row with
   `status = 'paid'` and a `razorpay_payment_id`; `invitations` should show
   `status = 'paid'` and a `paid_at` timestamp for that row.
8. **Cancel test**: start a payment, close the Checkout overlay without
   paying -- the button should show "Payment cancelled." and let you retry.
9. **Idempotency test**: re-run step 3's success case, then manually POST
   the same `/api/checkout/verify` body again (e.g. via your browser's
   devtools) -- it should return `{"status":"paid"}` again without erroring
   or double-writing (check `orders`/`invitations` are unchanged).
10. **Re-publish / live-update test**: after paying, edit the invitation
    again (new field value) -- the hosted link should reflect the edit
    immediately on refresh, with no new payment required.
11. **Unpaid draft stays hidden**: open the hosted link for a *different*,
    never-paid-for invitation (or any `short_id` you haven't paid for) --
    it must 404, never render the clean version.
12. **ZIP flag**: with `siteConfig.enableZipDownload` left at its default
    `false`, confirm no Download/ZIP button appears anywhere (design page or
    My Invitations) for a paid invitation. Flip it to `true` in
    `src/lib/config.ts` and confirm the button reappears and still produces
    a working ZIP -- the code never went away, it's just hidden.

### 4. Webhook (optional for local dev)

The webhook is a backstop for when a browser never calls `/api/checkout/verify`
(closed tab, network drop mid-payment) -- the test flow above already
confirms payments end-to-end without it. To test it for real you need a
public URL (e.g. `ngrok http 3000`) since Razorpay can't reach `localhost`:

1. Razorpay dashboard → **Settings → Webhooks** → add
   `https://<your-tunnel-or-domain>/api/razorpay/webhook`, subscribe to at
   least `payment.captured`.
2. Copy the webhook secret Razorpay shows you into `.env.local` as
   `RAZORPAY_WEBHOOK_SECRET` (restart `npm run dev` after).
3. Use the dashboard's "Send Test Webhook" button, or complete a real test
   payment, and confirm the request logs `received: true` with a 200.
   Before the secret is set, this route intentionally returns 503 rather
   than accept an unverified call.
