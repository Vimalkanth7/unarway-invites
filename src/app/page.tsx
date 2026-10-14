import Link from "next/link";
import { categories } from "@/lib/categories";
import { siteConfig } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Animated invitations, made yours in minutes
        </h1>
        <p className="mt-3 text-neutral-600">
          இலவசமாக எடிட் செய்து பார்வையிடுங்கள். தரவிறக்க மட்டும் கட்டணம்.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Browse a design, edit the details, preview for free. Pay only
          &#8377;{siteConfig.defaultPriceInInr} to download.
        </p>
      </section>

      <section className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-neutral-200 text-center hover:border-neutral-400"
          >
            <span className="font-medium">{category.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
