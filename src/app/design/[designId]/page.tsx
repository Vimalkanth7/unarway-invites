import { notFound } from "next/navigation";
import { DesignWorkspace } from "@/components/design/DesignWorkspace";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { siteConfig } from "@/lib/config";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  const bundle = await loadTemplateBundle(designId);
  if (!bundle) notFound();

  const price = bundle.meta.priceInInr ?? siteConfig.defaultPriceInInr;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{bundle.meta.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Edit and preview for free. Download for &#8377;{price} once checkout lands in Phase 6.
        </p>
      </div>
      <DesignWorkspace bundle={bundle} />
    </div>
  );
}
