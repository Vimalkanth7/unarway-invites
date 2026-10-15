import type { MetadataRoute } from "next";

/**
 * Hosted invitations (/i/<short-id>) are personal pages meant to be shared
 * by link, not discovered by search engines. The per-page `robots: noindex`
 * metadata on that route covers crawlers that already found a link; this
 * covers crawlers deciding whether to look in the first place.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/i/",
    },
  };
}
