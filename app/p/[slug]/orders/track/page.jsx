// =====================================
// PAGE: /p/[slug]/orders/track
// Descripción: Seguimiento público de pedidos Tags Tienda.
// =====================================

import { db } from "@/app/lib/tags-db";

import StoreOrderTrackClient from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title: "Seguimiento de pedido",
    robots: {
        index: false,
        follow: false
    }
};

export default async function Page({
    params,
    searchParams
}) {

    const prefilledOrder =    searchParams?.order || "";

    const { slug } =
        await params;

    const [rows] =
        await db.query(
            `
            SELECT
                id,
                name,
                slug,
                logo_url
            FROM tags_stores
            WHERE slug = ?
            LIMIT 1
            `,
            [slug]
        );

    const store =
        rows[0] || null;

    return (
        <StoreOrderTrackClient
            slug={slug}
            store={store}
            prefilledOrder={prefilledOrder}
        />
    );
}