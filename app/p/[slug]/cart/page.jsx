// =====================================
// Archivo:
// /app/p/[slug]/cart/page.jsx
//
// Descripción:
// Página pública de carrito de Tags Store.
//
// Contexto:
// store
// =====================================

import { notFound }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

import StoreCartPageClient
    from "@/app/modules/store/components/public/StoreCartPageClient";

import "@/app/modules/store/styles/store-public.css";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

async function getStore(slug) {
    const [rows] =
        await db.execute(
            `
            SELECT *
            FROM tags_stores
            WHERE slug = ?
            AND status = 'published'
            LIMIT 1
            `,
            [
                slug
            ]
        );

    return rows?.[0] || null;
}

export default async function Page({
    params
}) {
    const store =
        await getStore(
            params.slug
        );

    if (!store) {
        notFound();
    }

    return (
        <StoreCartPageClient
            store={store}
        />
    );
}