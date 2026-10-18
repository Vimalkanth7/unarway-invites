export const metadata = { title: "Privacy policy — Unarway Invites" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-neutral-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: when this page was published for Phase 8.</p>

      <div className="mt-8 flex flex-col gap-8">
        <Section title="1. What we collect">
          <p>
            Your email address (to sign you in with a magic link and send you order
            confirmations), the invitation details you type in (names, dates, venue,
            messages) and any photo you upload for an invitation, and payment records
            from Razorpay (amount, status, and Razorpay&apos;s own transaction ID — not
            your card or bank details, which Razorpay handles directly).
          </p>
        </Section>

        <Section title="2. How we use it">
          <p>
            To show you your saved invitations, build and host the finished invitation
            you&apos;ve paid for, verify payment, and email you about your account or
            orders. We don&apos;t sell your data or use it for advertising.
          </p>
        </Section>

        <Section title="3. Who else sees it">
          <p>
            Supabase (our database, authentication, and file storage provider) and
            Razorpay (our payment processor) each handle the data needed to do their
            part — login/storage and payment, respectively. We don&apos;t share your
            data with anyone else except where the law requires it.
          </p>
        </Section>

        <Section title="4. How long we keep it">
          <p>
            A paid invitation&apos;s hosted link, and the data behind it, stays
            available for the period shown at checkout (currently 12 months). Your
            account and draft invitations stay until you ask us to delete them.
          </p>
        </Section>

        <Section title="5. Your invitation&apos;s guests">
          <p>
            Anyone you send your hosted invitation link to can view it — it&apos;s not
            listed publicly or indexed by search engines, but anyone with the link can
            open it, the same as sharing a photo or a document link.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            You can ask us to access, correct, or delete your account data at any time
            by emailing <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">unarway@gmail.com</a>.
            Deleting your account also takes down any hosted invitation links tied to
            it.
          </p>
        </Section>

        <Section title="7. Cookies and local storage">
          <p>
            We use Supabase&apos;s authentication cookies/local storage to keep you
            signed in. We don&apos;t use advertising or tracking cookies.
          </p>
        </Section>

        <Section title="8. Changes">
          <p>
            We may update this policy as the service changes; the date above reflects
            the latest version.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions or requests about your data: <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">unarway@gmail.com</a>.
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
