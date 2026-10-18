import type { MetadataRoute } from "next";
import { categories } from "@/lib/categories";
import { listTemplateIds, loadTemplateBundle } from "@/lib/templates/loader";

/**
 * Deliberately excludes /i/<short-id>: those are personal, link-shared
 * invitation pages, not public listings -- see robots.ts and
 * /i/[shortId]/page.tsx's own `robots: noindex` metadata. Also excludes
 * account-only routes (/login, /my-invitations, /checkout, /auth) -- nothing
 * there is useful to a search engine.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const isProduction = process.env.NODE_ENV === "production";

  const ids = await listTemplateIds();
  const bundles = await Promise.all(ids.map((id) => loadTemplateBundle(id)));
  const designIds = bundles
    .filter((bundle) => bundle !== null && !(isProduction && bundle.meta.devOnly))
    .map((bundle) => bundle!.meta.id);

  const staticPaths = [
    "/",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
    "/refund-policy",
    ...categories.map((c) => `/category/${c.slug}`),
    ...designIds.map((id) => `/design/${id}`),
  ];

  return staticPaths.map((pathname) => ({
    url: `${baseUrl}${pathname}`,
    lastModified: new Date(),
  }));
}
