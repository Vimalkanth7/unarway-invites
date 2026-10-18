export const metadata = { title: "About — Unarway Invites" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">About Unarway Invites</h1>
      <div className="mt-6 flex flex-col gap-4 text-neutral-700">
        <p>
          Unarway Invites makes animated digital invitations for weddings, receptions,
          and birthdays, in Tamil and English. Browse a design, edit the names, dates,
          venue, and photos, and preview it on your own phone for free. You only pay
          when you&apos;re happy with it and ready to share it with your guests.
        </p>
        <p>
          A paid invitation unlocks a hosted link (<code className="text-sm">/i/&lt;your-invite&gt;</code>)
          you can send over WhatsApp, SMS, or email — no app required for your guests to
          open it.
        </p>
        <p>
          Unarway Invites is a small, independently run product. If something looks
          wrong or you have a question, see the <a href="/contact" className="underline hover:text-neutral-950">Contact</a> page.
        </p>
      </div>
    </div>
  );
}
