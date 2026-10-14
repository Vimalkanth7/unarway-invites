import { notFound } from "next/navigation";
import { categories, isCategorySlug } from "@/lib/categories";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{label} invitations</h1>
      <p className="mt-3 text-neutral-600">
        Designs for this category are coming soon. Check back shortly.
      </p>
    </div>
  );
}
