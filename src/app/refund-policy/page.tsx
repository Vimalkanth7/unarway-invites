export const metadata = { title: "Refund policy — Unarway Invites" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-neutral-700">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Refund policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: when this page was published for Phase 8.</p>

      <div className="mt-8 flex flex-col gap-8">
        <Section title="Why this policy">
          <p>
            An invitation is a digital product delivered instantly: as soon as payment
            is confirmed, your hosted link unlocks and you can share it with guests
            right away. Because of that instant delivery, we generally don&apos;t offer
            refunds once an invitation has been unlocked.
          </p>
        </Section>

        <Section title="When we do refund">
          <p>
            If your payment went through but your invitation never actually unlocked —
            because of a bug or outage on our end, not because you changed your mind or
            made an editing mistake — email <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">unarway@gmail.com</a> with
            the email address you paid with, and we&apos;ll investigate and refund you
            if that&apos;s what happened.
          </p>
        </Section>

        <Section title="When we don't refund">
          <p>
            Once your invitation is unlocked and shareable, we don&apos;t refund for
            change of mind, picking the wrong design, a typo you entered yourself, or
            your event being postponed or cancelled. You can keep editing and
            re-publishing an invitation you&apos;ve already paid for at no extra cost,
            so most mistakes can simply be fixed rather than refunded.
          </p>
        </Section>

        <Section title="How refunds are paid">
          <p>
            Approved refunds go back to the original payment method through Razorpay.
            How long it takes to actually land depends on Razorpay&apos;s own
            processing and your bank, not on us — we don&apos;t have a fixed number of
            days to quote here.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For a refund request: <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">unarway@gmail.com</a>.
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
