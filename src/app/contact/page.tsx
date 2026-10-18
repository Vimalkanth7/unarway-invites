export const metadata = { title: "Contact — Unarway Invites" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Contact</h1>
      <div className="mt-6 flex flex-col gap-4 text-neutral-700">
        <p>
          For order issues, refund requests, or general questions, email{" "}
          <a href="mailto:unarway@gmail.com" className="underline hover:text-neutral-950">
            unarway@gmail.com
          </a>
          . We try to reply within 2 business days.
        </p>
        <p>
          If you&apos;re writing about a payment problem, please include the email
          address you used to sign in and, if you have it, the order or invitation name
          — it helps us find your record faster.
        </p>
        <p>
          Seller: <span className="italic text-neutral-500">[legal seller name and trade name, to be confirmed with my CA]</span>.
          Registered business address: <span className="italic text-neutral-500">[to be added before launch]</span>.
        </p>
      </div>
      <p className="mt-10 text-xs text-neutral-400">This text has not had a legal review.</p>
    </div>
  );
}
