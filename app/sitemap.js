import { getPublicSitemapContext, getPublicSitemapEntries } from "@/app/lib/seo/publicSitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function sitemap() {
  const context = await getPublicSitemapContext();
  return getPublicSitemapEntries(context);
}
