// =====================================
// PAGE: /p/[slug]/orders/track
// Descripción: Seguimiento público de pedidos Tags Tienda.
// =====================================

import { db } from "@/app/lib/tags-db";

import StoreOrderTrackClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getStore(slug) {
    const [rows] = await db.query(
        `SELECT s.id,s.slug,
                COALESCE(NULLIF(b.display_name,''),NULLIF(b.name,''),NULLIF(s.name,'')) business_name,
                COALESCE(
                    NULLIF(b.logo_url,''),
                    (SELECT NULLIF(dm.url,'')
                       FROM tags_directory_listings dl
                       INNER JOIN tags_directory_media dm ON dm.listing_id=dl.id
                      WHERE dl.business_id=s.business_id
                        AND dm.media_type='logo'
                        AND dm.is_active=1
                      ORDER BY dm.sort_order,dm.id
                      LIMIT 1)
                ) business_logo_url,
                (SELECT ds.name
                   FROM tags_directory_listings dl
                   INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id
                   INNER JOIN tags_directory_sites ds ON ds.id=dsl.site_id AND ds.is_active=1
                  WHERE dl.business_id=s.business_id
                  ORDER BY (dsl.publication_status='published') DESC,dsl.id
                  LIMIT 1) directory_name,
                (SELECT ds.brand_config
                   FROM tags_directory_listings dl
                   INNER JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id
                   INNER JOIN tags_directory_sites ds ON ds.id=dsl.site_id AND ds.is_active=1
                  WHERE dl.business_id=s.business_id
                  ORDER BY (dsl.publication_status='published') DESC,dsl.id
                  LIMIT 1) directory_brand_config
         FROM tags_stores s
         LEFT JOIN tags_businesses b ON b.id=s.business_id
         WHERE s.slug=? LIMIT 1`,
        [slug]
    );
    const row = rows[0];
    if (!row) return null;

    let directoryBrand = {};
    try {
        directoryBrand = typeof row.directory_brand_config === "string"
            ? JSON.parse(row.directory_brand_config)
            : (row.directory_brand_config || {});
    } catch {
        directoryBrand = {};
    }

    const hasBusinessLogo = Boolean(row.business_logo_url);
    return {
        ...row,
        name: hasBusinessLogo
            ? row.business_name
            : (directoryBrand.slogan || "La Plataforma Comercial de Calamuchita"),
        logo_url: hasBusinessLogo
            ? row.business_logo_url
            : (directoryBrand.logoUrl || directoryBrand.logo_url || "/assets/images/tags/logoCalamuchitar.webp"),
        is_directory_fallback: !hasBusinessLogo
    };
}

export async function generateMetadata({ params }) {
    const { slug } = await Promise.resolve(params);
    const store = await getStore(slug);
    const title = `Seguimiento de pedido${store?.name ? ` | ${store.name}` : ""}`;
    const description = "Consultá el estado de tu compra en La Plataforma Comercial de Calamuchita.";
    return {
        title,
        description,
        openGraph: { title, description, type: "website", siteName: "La Plataforma Comercial de Calamuchita", ...(store?.logo_url ? { images: [{ url: store.logo_url }] } : {}) },
        twitter: { card: store?.logo_url ? "summary_large_image" : "summary", title, description, ...(store?.logo_url ? { images: [store.logo_url] } : {}) },
        robots: { index: false, follow: false }
    };
}

export default async function Page({
    params,
    searchParams
}) {

    const query = await Promise.resolve(searchParams || {});
    const prefilledOrder = query?.order || "";

    const { slug } =
        await params;

    const store = await getStore(slug);

    return (
        <StoreOrderTrackClient
            slug={slug}
            store={store}
            prefilledOrder={prefilledOrder}
        />
    );
}
