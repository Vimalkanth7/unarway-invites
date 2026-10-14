import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, isCategorySlug } from "@/lib/categories";
import { listTemplatesByCategory } from "@/lib/templates/loader";

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategorySlug(category)) notFound();

  const label = categories.find((c) => c.slug === category)!.label;
  const designs = await listTemplatesByCategory(category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{label} invitations</h1>

      {designs.length === 0 ? (
        <p className="mt-3 text-neutral-600">
          Designs for this category are coming soon. Check back shortly.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {designs.map((design) => (
            <Link
              key={design.meta.id}
              href={`/design/${design.meta.id}`}
              className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-neutral-200 p-4 text-center hover:border-neutral-400"
            >
              <span className="font-medium">{design.meta.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
