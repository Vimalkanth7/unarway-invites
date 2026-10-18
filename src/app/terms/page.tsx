export const metadata = { title: "Terms of service — Unarway Invites" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-neutral-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Terms of service</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: when this page was published for Phase 8.</p>

      <div className="mt-8 flex flex-col gap-8">
        <Section title="1. The service">
          <p>
            Unarway Invites (&quot;we&quot;, &quot;us&quot;) lets you browse animated
            invitation designs, edit the details and preview them for free, and pay to
            unlock a hosted, shareable link for a finished invitation. These terms apply
            whenever you use the site.
          </p>
        </Section>

        <Section title="2. Accounts">
          <p>
            You sign in with a magic link sent to your email — there&apos;s no password
            to manage. You&apos;re responsible for keeping access to that email address
            secure, since it&apos;s how we verify who owns an invitation.
          </p>
        </Section>

        <Section title="3. Pricing and payment">
          <p>
            Prices are shown in Indian Rupees (₹) on each design before you pay.
            Payments are processed by Razorpay; we never see or store your card, UPI, or
            bank details. An invitation is unlocked only after Razorpay confirms the
            payment succeeded.
          </p>
        </Section>

        <Section title="4. What you get">
          <p>
            Paying for an invitation unlocks a hosted link you can share with your
            guests. The link stays live for 12 months from the date of payment. You can
            keep editing and re-publishing an invitation you&apos;ve paid for — changes
            don&apos;t require paying again.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>
            Invitations are for your own personal event. Don&apos;t use the service to
            publish anything illegal, defamatory, or infringing someone else&apos;s
            rights, and don&apos;t upload a photo you don&apos;t have the right to use.
            You&apos;re responsible for the names, dates, photos, and other details you
            enter.
          </p>
        </Section>

        <Section title="6. Our content">
          <p>
            The invitation designs, artwork, animations, and code are owned by Unarway
            Invites or licensed to us. Paying for an invitation gives you the right to
            use that one finished invitation for your event — it doesn&apos;t give you
            the underlying design, template, or source files to resell or reuse
            elsewhere. This holds because any design that isn&apos;t fully licensed is
            hidden from browsing, editing, and purchase until it is — see the
            &quot;licensed assets&quot; item in the project&apos;s Launch checklist.
          </p>
        </Section>

        <Section title="7. Refunds">
          <p>
            See our <a href="/refund-policy" className="underline hover:text-neutral-950">Refund policy</a> —
            it&apos;s part of these terms.
          </p>
        </Section>

        <Section title="8. Liability">
          <p>
            The service is provided as-is. We work to keep it reliable, but we&apos;re
            not liable for indirect losses (like a guest not receiving an invitation
            because of their own network or device issues) beyond refunding the amount
            you paid, where our refund policy applies.
          </p>
        </Section>

        <Section title="9. Changes">
          <p>
            We may update these terms as the service changes; the date above reflects
            the latest version. Continuing to use the service after an update means you
            accept the new terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Seller: <span className="italic text-neutral-500">[legal seller name and trade name, to be confirmed with my CA]</span>.
            Questions about these terms: <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">unarway@gmail.com</a>.
            Registered business address: <span className="italic text-neutral-500">[to be added before launch]</span>.
          </p>
        </Section>
      </div>

      <p className="mt-10 text-xs text-neutral-400">
        This page is a working draft written for Phase 8 and hasn&apos;t had a legal
        review yet — recommended before this goes live for real customers.
      </p>
    </div>
  );
}
