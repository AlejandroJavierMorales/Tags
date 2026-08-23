import { getPublicSitemapContext, getSitemapUrl } from "@/app/lib/seo/publicSitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function robots() {
  const context = await getPublicSitemapContext();

  const commonDisallow = [
    "/login",
    "/logout",
    "/setup",
    "/activate",
    "/supports",
    "/private",
    "/dashboard",
    "/admin/",
    "/api/",
    "/_next/",
    "/t/",
    "/e/",
  ];

  return {
    rules: [{
      userAgent: "*",
      allow: context.isTags ? ["/", "/p/"] : ["/", "/directorio"],
      disallow: context.isTags
        ? commonDisallow
        : [...commonDisallow, "/p/"],
    }],
    sitemap: getSitemapUrl(context),
    host: context.baseUrl,
  };
}
