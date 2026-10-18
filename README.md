# Unarway Invitations

Invitation website by Unarway: free browse/edit/preview, paid download.
Categories: Marriage, Reception, Birthday, Other. Tamil and English, mobile-first.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres/Auth/Storage),
Razorpay, deployed on Vercel.

See `CLAUDE.md` for the full rules (payment trust boundary, secrets, assets,
code style) that apply to every change in this repo.

## Status

**Phase 6 complete, in test mode.** Razorpay order creation, signature-verified
checkout, an idempotent webhook, and the `/i/<short-id>` hosted page (the paid
deliverable — ZIP download still works but stays hidden behind
`siteConfig.enableZipDownload`) are all live against Razorpay's test-mode keys.
Switching to live keys is a Launch checklist item, not done yet. Phase 7 is
done: the "list" field type landed (list items now also support "tel" and
"url"), and designs 2 and 3 (`malligai-mandapam` and `christian-garden`, both
Marriage) are built. See "Phased plan" below, and the Launch checklist before
selling any design.

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
- [x] **Phase 7 — Designs 2 and 3**: engine gained a "list" field type (per-item
      validation, used for repeatable event schedules; list items now also support
      "tel" -- normalized to 10 digits starting 6-9, rendered `tel:+91...` -- and
      "url" -- https + exact-hostname allowlist). A new `unarway:open` postMessage
      (handled in `PreviewFrame.tsx`) lets a sandboxed template ask the parent to open
      a `wa.me`/`tel:`/Google Maps link on its behalf, since `sandbox="allow-scripts"`
      (no `allow-popups`) silently blocks a real `<a target="_blank">` click -- the
      allowlist lives in `src/lib/templates/link-allowlist.ts`, shared by the editor's
      own map-link validation so the two checks can't drift apart.
      Design 2, `malligai-mandapam` (a Marriage design, dawn/jasmine/brass-lamp theme),
      is built: no stock photos or downloaded audio -- visuals are SVG/CSS/canvas/
      Three.js, the ambient background sound is synthesized at runtime with the Web
      Audio API, `three.min.js` loads dynamically only once a capability check passes,
      and name reveals split by Unicode grapheme (falling back to word-level) so Tamil
      is never cut mid-glyph.
      Design 3, `christian-garden` (also Marriage -- see the note below), ported a
      finished third-party sample onto the same DCLogic/mustache engine rather than
      keeping its original one-shot script. All personal data from the source sample
      was replaced with invented placeholders before anything shipped (see
      `templates/christian-garden/defaults.json`). `ceremonyDate`/`ceremonyVenue`
      (flat fields) drive the gate/date-card/countdown/share metadata; the `events`
      list stays for the Celebrations schedule only. Its four list fields
      (`events`/`wishes`/`callsGroom`/`callsBride`) are built imperatively rather than
      with `sc-for` (same reasoning as `malligai-mandapam`'s `syncEvents()`) and all
      tolerate 0 items -- wishes/calls cards hide entirely when empty, a missing map
      link just omits that event's Directions button. The GSAP ScrollTrigger beat
      timeline is rebuilt only when list *structure* changes (item counts, or a map
      link appearing/disappearing), debounced 300ms, returning to the current beat
      afterward -- not rebuilt on every keystroke. Past ceremonies show "The
      celebration has taken place" instead of a negative/NaN countdown.
      Two Marriage designs now exist and none for Reception/Birthday/Other --
      `christian-garden`'s source sample covers an engagement + wedding + reception
      on one page, which could also have fit "Reception"; kept as Marriage per an
      explicit decision when this was planned. Worth revisiting before adding a
      fourth design.
      `npm run check:templates` validates every design's contract (postMessage,
      no localStorage/cookies/external requests, size budget, +05:30 on date fields,
      every asset logged in `ASSETS.md`) -- currently passing for `malligai-mandapam`,
      `christian-garden`, and `sample-card`; `temple-journey` fails the new 3 MB size
      budget on its existing (already-flagged-UNLICENSED) placeholder video/audio,
      which is exactly the Launch checklist item above about replacing that media,
      not a new problem.
      `three.min.js` (vendored for `malligai-mandapam`) logs a harmless console
      deprecation warning ("Scripts build/three.js and build/three.min.js are
      deprecated with r150+") -- it's r160, confirmed via its own embedded `REVISION`
      string. The last build without that warning is r149; kept the current one rather
      than swap it blind, since there's no way to verify the lamp scene still renders
      identically without a real browser to look at. Revisit if it's ever actually
      removed (the warning says r160, i.e. now) rather than just deprecated.
      Not verified for `christian-garden`: an actual browser or phone -- see the
      "Testing `christian-garden`" note below for the manual pass still needed
      (scroll-beat behaviour, music-on-gate-tap, `wa.me`/tap-to-call/map links, and
      the real-device/WhatsApp-in-app-browser checks) before it's considered done.
- [ ] **Phase 8 — Legal pages + deploy** (legal pages and sitemap done, deploy/live-keys not
      started): About/Contact/Terms/Privacy/Refund now have real written content (replacing
      the `PlaceholderPage` stubs from earlier phases) -- all marked as a working draft with
      no legal review yet, and two spots (`Contact`, `Terms`, `Privacy`) carry a
      `[to be added before launch]` placeholder for the registered business address, since
      that wasn't available when this was written. Support email is `unarway@gmail.com`.
      Refund policy: no refunds once an invitation is unlocked/shared, except when payment
      succeeded but unlocking failed due to a fault on our end.
      `src/app/sitemap.ts` now exists -- it deliberately excludes `/i/<short-id>` URLs
      (hosted invitations are personal, link-shared pages, not for search engines; enforced
      separately via the `robots: { index: false, follow: false }` metadata on
      `/i/[shortId]/page.tsx` and an `X-Robots-Tag: noindex` header on the og-image route,
      not via `src/app/robots.ts`, which deliberately allows everything so WhatsApp's/
      Facebook's link-preview crawlers and search engines can still reach that page to read
      its own `noindex` tag) and excludes account-only routes (`/login`, `/my-invitations`,
      `/checkout`, `/auth`). It lists `/`, the five legal pages, one URL per category, and
      one `/design/<id>` per non-`devOnly` template, using `NEXT_PUBLIC_SITE_URL` (already
      documented in `.env.example`, not previously read anywhere in the code) as the base.
      Still open for Phase 8: production Supabase project, Vercel env vars, Razorpay live
      keys (still server-gated), full paid-flow smoke test against production, and filling
      in the real business address placeholder.

## Launch checklist

Blocking — none of these may be skipped before a design is sold to a real
customer (test/dev use is fine without them):

- [ ] Every file marked "UNLICENSED - replace before launch" in `ASSETS.md`
      is replaced with licensed or custom-shot media, and `ASSETS.md` is
      updated with the replacement's source and licence.
- [ ] `templates/christian-garden/defaults.json`'s placeholder dates (currently
      ~2027-11) are far enough in the past that its countdown/"Save the date"
      card would show "The celebration has taken place" to anyone previewing
      the design unedited. Refresh them yearly (or whenever noticed) to stay
      roughly a year out -- not launch-blocking by itself, but worth a glance
      at the same time as the UNLICENSED-media pass above.
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

## Testing christian-garden (manual, not yet done)

Everything automatable has been checked (`npm run check:templates` passes,
every asset serves 200 through the asset route, the inline scripts parse, the
seed JSON matches `defaults.json`/`schema.json`). Nothing below has been
checked in an actual browser or phone -- there wasn't one available while
building this:

```
npm run dev -- -p 3100   # or whatever port is free; never next build while another dev server owns .next
```
then open `http://localhost:3100/design/christian-garden` (editor + live
preview) and `http://localhost:3100/api/templates/christian-garden/view`
(the template alone, full-size).

- At phone width (375px), walk all 8 beats both by small swipes and by the
  "Please scroll the screen" button on beat 0 -- each nudge should land
  exactly on a beat, never mid-transition.
- Edit a field in the editor panel (e.g. a name) and confirm the preview text
  updates live with no reload. Then add/remove an event, a wish, or a call
  (or clear an event's map link) and confirm the scene rebuilds and the
  scroll position returns to roughly where it was, not beat 0 -- this is the
  debounced (~300ms) ScrollTrigger rebuild path, the one piece of this design
  with no automated check.
- Delete every item from `wishes`, `callsGroom`, and `callsBride` one at a
  time and confirm each card disappears cleanly (not a blank gap) while the
  rest of that beat still renders.
- Set `ceremonyDate` to a date in the past and confirm the date card shows
  "The celebration has taken place" instead of a negative or `NaN` countdown.
- Tap "Open Invitation" on the gate and confirm music actually starts (this
  is the first real `<audio>` element used by any template here --
  `malligai-mandapam` only ever used synthesized Web Audio oscillators, which
  behave differently around autoplay policy).
- Tap the WhatsApp share button, a tap-to-call row, and an event's Directions
  button; confirm each opens correctly rather than doing nothing (the
  sandboxed iframe blocks a plain link click -- these now go through the new
  `unarway:open` postMessage/allowlist in `PreviewFrame.tsx`).
- Browser console should stay clean (no CSP violations, no errors) through
  all of the above.
- Real-device pass: repeat the music/WhatsApp/tap-to-call checks on an actual
  Android phone and an iPhone, including inside WhatsApp's own in-app browser
  -- that embedded browser is often stricter about autoplay and popups than
  a normal mobile Chrome/Safari tab.
- Contrast/text-size pass: same method as the `malligai-mandapam` scene-2 fix
  (DevTools → Rendering → "Emulate vision deficiencies" plus a manual
  foreground/background hex check against WCAG 4.5:1), confirming no text
  sits directly on the brighter parts of `aisle.webp`/`swing.webp` without a
  scrim, and nothing is under the 16px/44px rules in CLAUDE.md.

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

### How draft resume works

Opening `/design/<id>?invitation=<uuid>` (from autosave's own `router.replace`,
or from a My Invitations "Open" link) makes the **server** -- not the browser --
the source of truth for what the editor and preview start with:

1. `design/[designId]/page.tsx` looks the row up with the signed-in user's own
   RLS-scoped session, merges it *over* `defaults.json` (so a schema field added
   after the draft was created still gets a sane default instead of `undefined`),
   resolves any photo field to a signed Storage URL, and passes the result to
   `DesignWorkspace` as `initialConfig` -- a plain prop, not something fetched
   client-side after mount.
2. If a `?invitation=` was present but the row couldn't be loaded (RLS denial,
   wrong design, genuinely missing, a query error), the page says so explicitly
   (`loadFailed`) instead of silently handing back `defaults.json` with no trace
   of why. `DesignWorkspace` shows a "Couldn't load your saved draft" banner and
   refuses to autosave in that state -- without this guard, the first edit would
   call `ensureInvitation()`, see no known id, and silently create a *second*
   draft row instead of resuming the first.
3. `PreviewFrame` reaches "ready" either from the iframe's `unarway:ready`
   postMessage, or -- if that message was fired before this component had even
   mounted and attached its listener (the iframe is a separate document load
   that can finish first) -- from the iframe's own native `load` event as a
   backup. Either way, only once "ready" is it allowed to postMessage the
   *current* config into the iframe; until then the iframe is just showing its
   own hardcoded seed values from `<script id="inv-config">`, which is expected.

If a resumed draft ever looks wrong again, Supabase dashboard → **Logs** →
**Postgres Logs**/**API Logs** (per above) will show whether the `SELECT` on
`invitations` for that id/user actually returned a row.

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
