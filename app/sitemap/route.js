import { getPublicSitemapContext, getPublicSitemapEntries, sitemapEntriesToXml } from "@/app/lib/seo/publicSitemap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const context = await getPublicSitemapContext();
  const entries = await getPublicSitemapEntries(context);
  return new Response(sitemapEntriesToXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
