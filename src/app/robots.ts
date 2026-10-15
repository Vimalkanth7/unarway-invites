import type { MetadataRoute } from "next";

/**
 * Deliberately does NOT disallow /i/ here. A robots.txt block stops
 * WhatsApp's and Facebook's link-preview crawlers from fetching the page at
 * all, breaking the og:image/title preview that's the whole point of
 * sharing the link -- and it stops search engines from ever reading the
 * page's own `robots: noindex` meta tag, which is what's actually keeping
 * hosted invitations out of search results (see /i/[shortId]/page.tsx and
 * the og-image route's X-Robots-Tag header).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
