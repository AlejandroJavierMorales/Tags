// =====================================
// Archivo:
// /app/p/[slug]/checkout/page.jsx
//
// Descripción:
// Página pública de checkout de Tags Store.
// Obtiene la tienda por slug y renderiza
// el checkout usando la lógica existente.
//
// Contexto:
// store
// =====================================

import { notFound }
    from "next/navigation";

import { db }
    from "@/app/lib/tags-db";

import StoreCheckoutPageClient
    from "@/app/modules/store/components/public/StoreCheckoutPageClient";

import "@/app/modules/store/styles/store-public.css";

export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";

function safeParse(value) {
    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

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

    const store =
        rows?.[0];

    if (!store) {
        return null;
    }

    return {
        ...store,
        settings_json:
            safeParse(store.settings_json),
        styles_json:
            safeParse(store.styles_json)
    };
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
        <StoreCheckoutPageClient
            store={store}
        />
    );
}